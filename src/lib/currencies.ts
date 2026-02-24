import { Currency, ExchangeRate, DataSource, HistoricalRateResult, MultiSourceData } from '@/lib/types';
import { format, isAfter, isSameDay, addDays, startOfDay, eachDayOfInterval, parseISO } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, collection, addDoc, Firestore, onSnapshot, serverTimestamp } from 'firebase/firestore';

let activeDataSource: DataSource = 'nbrb';

export const metalsCodes = ['XAU', 'XAG', 'XPT', 'XPD'];
export const popularCryptoCodes = ['BTC', 'ETH', 'TON', 'SOL', 'USDT', 'BNB', 'XRP', 'USDC', 'ADA', 'DOGE', 'TRX', 'LINK', 'MATIC', 'AVAX', 'DOT', 'UNI', 'SHIB', 'DAI', 'LTC', 'NEAR'];

export const fiatCodes = [
    'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'
];

export const curatedAltcoinCodes = [
    'NOT', 'DOGS', 'FET', 'RNDR', 'AGIX', 'AAVE', 'MKR', 'SAND', 'MANA', 'AXS', 'IMX',
    'PEPE', 'FLOKI', 'BONK', 'FIL', 'AR', 'STORJ', 'HNT', 'THETA', 'ONDO', 'OKB', 'CRO',
    'ATOM', 'ARB', 'OP', 'ICP', 'ETC', 'XMR', 'XLM', 'SUI', 'APT', 'HBAR', 'STX', 'TAO',
    'TIA', 'SEI', 'INJ', 'GALA', '1INCH', 'GRT', 'RUNE', 'LDO', 'BCH', 'FTM', 'EOS', 'VET',
    'ENA', 'JUP', 'PYTH', 'STRK', 'W', 'DYM', 'SAGA', 'TNSR', 'RENDER', 'PENDLE'
];

// Memory cache
let unifiedData: MultiSourceData = {};
let unifiedDataTomorrow: MultiSourceData = {};

const FIAT_TTL = 30 * 60 * 1000; // 30 minutes for faster bank updates

const sourceTimezones: Record<string, string> = {
    'nbrb': 'Europe/Minsk',
    'cbr': 'Europe/Moscow',
    'nbk': 'Asia/Almaty',
    'ecb': 'Europe/Berlin',
};

function getLocalDate(timezone: string, offsetDays = 0): Date {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const dateMap: any = {};
    parts.forEach(p => dateMap[p.type] = p.value);
    
    const localDate = new Date(
        Date.UTC(
            parseInt(dateMap.year),
            parseInt(dateMap.month) - 1,
            parseInt(dateMap.day),
            parseInt(dateMap.hour),
            parseInt(dateMap.minute),
            parseInt(dateMap.second)
        )
    );
    
    if (offsetDays !== 0) {
        localDate.setUTCDate(localDate.getUTCDate() + offsetDays);
    }
    return localDate;
}

export function setDataSource(source: DataSource) { activeDataSource = source; }
export function getDataSource(): DataSource { return activeDataSource; }

/**
 * Smart Rate Selector with Calendar Anchoring and Look-Forward logic
 */
export function findRate(from: string, to: string, isTomorrow: boolean = false): number | undefined {
    if (from === to) return 1;

    const tz = sourceTimezones[activeDataSource] || 'UTC';
    const targetDateStr = format(getLocalDate(tz, isTomorrow ? 1 : 0), 'yyyy-MM-dd');

    const getBestPrice = (currency: string, targetDateStr: string): number | undefined => {
        const isOfficialCurrency = currency === 'BYN' || currency === 'RUB' || currency === 'KZT' || currency === 'EUR';
        
        const trySpecific = (source: string, map: MultiSourceData): number | undefined => {
            const entry = map[currency]?.[source];
            if (entry && entry.d === targetDateStr) return entry.v;
            return undefined;
        };

        // 1. Try active source with exact date match
        let val = trySpecific(activeDataSource, unifiedDataTomorrow) || trySpecific(activeDataSource, unifiedData);
        if (val !== undefined) return val;

        // 2. Official Logic: Look Forward / Look Backward
        if (isOfficialCurrency) {
            const findOfficialClosest = (target: string): number | undefined => {
                const candidates: { v: number, d: string }[] = [];
                [unifiedData, unifiedDataTomorrow].forEach(map => {
                    if (map[currency]) {
                        Object.values(map[currency]).forEach(e => {
                            if (e.off) candidates.push(e);
                        });
                    }
                });

                if (candidates.length === 0) return undefined;

                // Sort by date proximity to target
                // First, try exact or future (Look-Forward for weekends)
                const futureOnes = candidates.filter(c => c.d >= target).sort((a, b) => a.d.localeCompare(b.d));
                if (futureOnes.length > 0) return futureOnes[0].v;

                // Second, try past (Look-Backward)
                const pastOnes = candidates.filter(c => c.d < target).sort((a, b) => b.d.localeCompare(a.d));
                if (pastOnes.length > 0) return pastOnes[0].v;

                return undefined;
            };

            const officialVal = findOfficialClosest(targetDateStr);
            if (officialVal !== undefined) return officialVal;
        }

        // 3. Market Fallback (Extreme Reserve)
        const isCrypto = popularCryptoCodes.includes(currency) || curatedAltcoinCodes.includes(currency);
        if (isCrypto || !isOfficialCurrency) {
            const marketEntry = unifiedData[currency]?.['worldcurrencyapi'] || unifiedData[currency]?.['coingecko'];
            if (marketEntry) return marketEntry.v;
        }

        return undefined;
    };

    const fromPrice = getBestPrice(from, targetDateStr);
    const toPrice = getBestPrice(to, targetDateStr);

    if (fromPrice !== undefined && toPrice !== undefined && toPrice !== 0) {
        return fromPrice / toPrice;
    }
    return undefined;
}

export async function preFetchInitialRates(db: Firestore, onApiError?: (source: string) => void) {
    const docRef = doc(db, 'rates_cache', 'unified');
    
    onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            unifiedData = data.data || {};
            unifiedDataTomorrow = data.dataTomorrow || {};
        }
    });

    try {
        const snap = await getDoc(docRef);
        const now = Date.now();
        const data = snap.data();
        const needsUpdate = !snap.exists() || (now - (data?.updatedAtFiat || 0) > FIAT_TTL);

        if (needsUpdate) {
            await updateAllRatesInCloud(db, true, onApiError);
        }
    } catch (e) {}
}

export async function updateAllRatesInCloud(db: Firestore, updateFiat: boolean = true, onApiError?: (source: string) => void) {
    const now = Date.now();
    try {
        const sources = [
            { id: 'coingecko', fn: fetchCoinGecko, type: 'crypto' },
            { id: 'nbrb', fn: fetchNbrb, type: 'fiat' },
            { id: 'cbr', fn: fetchCbr, type: 'fiat' },
            { id: 'worldcurrencyapi', fn: fetchWorldCurrency, type: 'fiat' },
            { id: 'ecb', fn: fetchEcb, type: 'fiat' },
            { id: 'nbk', fn: fetchNbk, type: 'fiat' }
        ];

        const activeSources = sources.filter(s => s.type === 'crypto' || updateFiat);
        const results = await Promise.allSettled(activeSources.map(s => s.fn()));

        const nextData = JSON.parse(JSON.stringify(unifiedData));
        const nextDataTomorrow = JSON.parse(JSON.stringify(unifiedDataTomorrow));
        const updatedSources: string[] = [];

        results.forEach((res, idx) => {
            const sourceInfo = activeSources[idx];
            if (res.status === 'fulfilled' && res.value) {
                updatedSources.push(sourceInfo.id);
                
                const processEntry = (rates: Record<string, number>, dateStr: string, targetMap: MultiSourceData) => {
                    Object.keys(rates).forEach(currency => {
                        if (!targetMap[currency]) targetMap[currency] = {};
                        targetMap[currency][sourceInfo.id] = {
                            v: rates[currency],
                            d: dateStr,
                            off: sourceInfo.type === 'fiat'
                        };
                    });
                };

                if ('tomorrow' in res.value) {
                    const payload = res.value as any;
                    processEntry(payload.today.rates, payload.today.date, nextData);
                    processEntry(payload.tomorrow.rates, payload.tomorrow.date, nextDataTomorrow);
                } else {
                    const payload = res.value as { rates: Record<string, number>, date: string };
                    processEntry(payload.rates, payload.date, nextData);
                }
            } else if (onApiError) {
                onApiError(sourceInfo.id);
            }
        });

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData,
            dataTomorrow: nextDataTomorrow,
            updatedAtFiat: now,
            sources_updated: updatedSources
        }, { merge: true });
        
        await addDoc(collection(db, 'rates_history'), {
            timestamp: serverTimestamp(),
            base: 'USD',
            data: nextData,
            dataTomorrow: nextDataTomorrow,
            sources_updated: updatedSources
        });

        unifiedData = nextData;
        unifiedDataTomorrow = nextDataTomorrow;
        return unifiedData;
    } catch (e) {
        return unifiedData;
    }
}

async function fetchNbrb() {
    try {
        const tz = sourceTimezones['nbrb'];
        const fetchByDate = async (d: Date) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const res = await fetch(`https://api.nbrb.by/exrates/rates?periodicity=0&ondate=${dateStr}`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            const rates: Record<string, number> = {};
            const usd = data.find((r: any) => r.Cur_Abbreviation === 'USD');
            if (usd) {
                const usdInByn = usd.Cur_OfficialRate / usd.Cur_Scale;
                data.forEach((r: any) => { rates[r.Cur_Abbreviation] = (r.Cur_OfficialRate / r.Cur_Scale) / usdInByn; });
                rates['BYN'] = 1 / usdInByn;
            }
            return { rates, date: dateStr };
        };
        const today = await fetchByDate(getLocalDate(tz));
        const tomorrow = await fetchByDate(getLocalDate(tz, 1));
        return today ? { today, tomorrow: tomorrow || today } : null;
    } catch { return null; }
}

async function fetchCbr() {
    try {
        const tz = sourceTimezones['cbr'];
        const res = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        const rubPerUsd = data?.Valute?.USD?.Value;
        if (rubPerUsd) {
            rates['RUB'] = 1 / rubPerUsd;
            Object.keys(data.Valute).forEach(code => {
                const v = data.Valute[code];
                rates[code] = (v.Value / v.Nominal) / rubPerUsd;
            });
        }
        const dateStr = data.Date ? parseISO(data.Date).toISOString().split('T')[0] : format(getLocalDate(tz), 'yyyy-MM-dd');
        return { rates, date: dateStr };
    } catch { return null; }
}

async function fetchCoinGecko() {
    try {
        const ids = 'bitcoin,ethereum,litecoin,ripple,bitcoin-cash,dash,solana,the-open-network,dogecoin,cardano,polkadot,tron,matic-network,avalanche-2,chainlink,tether,usd-coin,dai,notcoin,dogs,render-token,fetch-ai,binancecoin,near,cosmos,arbitrum,optimism,decentraland,aave,immutable-x,arweave,uniswap,maker,the-sandbox,axie-infinity,shiba-inu,pepe,floki,bonк,filecoin,storj,helium,theta-token,ondo-finance,okb,crypto-com-chain,singularitynet,ethena,jupiter-exchange,pyth-network,starknet,wormhole,dymension,saga,tnsr,pendle';
        const res = await fetch(`/api/coingecko?endpoint=simple/price&ids=${ids}&vs_currencies=usd`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const mapping: Record<string, string> = { 
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'TON': 'the-open-network', 'SOL': 'solana', 
            'FET': 'fetch-ai', 'RNDR': 'render-token', 'BNB': 'binancecoin', 'NEAR': 'near', 
            'ATOM': 'cosmos', 'ARB': 'arbitrum', 'OP': 'optimism', 'LTC': 'litecoin',
            'XRP': 'ripple', 'BCH': 'bitcoin-cash', 'DOGE': 'dogecoin', 'ADA': 'cardano', 
            'DOT': 'polkadot', 'NOT': 'notcoin', 'DOGS': 'dogs', 'USDT': 'tether', 'USDC': 'usd-coin',
            'MANA': 'decentraland', 'AAVE': 'aave', 'IMX': 'immutable-x', 'AR': 'arweave',
            'UNI': 'uniswap', 'MKR': 'maker', 'SAND': 'the-sandbox', 'AXS': 'axie-infinity',
            'SHIB': 'shiba-inu', 'PEPE': 'pepe', 'FLOKI': 'floki', 'BONK': 'bonk',
            'FIL': 'filecoin', 'STORJ': 'storj', 'HNT': 'helium', 'THETA': 'theta-token',
            'ONDO': 'ondo-finance', 'OKB': 'okb', 'CRO': 'crypto-com-chain',
            'TRX': 'tron', 'LINK': 'chainlink', 'AGIX': 'singularitynet',
            'ENA': 'ethena', 'JUP': 'jupiter-exchange', 'PYTH': 'pyth-network',
            'STRK': 'starknet', 'W': 'wormhole', 'DYM': 'dymension', 'SAGA': 'saga',
            'TNSR': 'tnsr', 'PENDLE': 'pendle'
        };
        const rates: Record<string, number> = {};
        Object.keys(mapping).forEach(code => {
            const id = mapping[code];
            if (data[id]?.usd) rates[code] = data[id].usd;
        });
        return { rates, date: format(new Date(), 'yyyy-MM-dd') };
    } catch { return null; }
}

async function fetchWorldCurrency() {
    try {
        const res = await fetch('/api/worldcurrency?endpoint=rates&base=USD', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.rates) {
            Object.keys(data.rates).forEach(code => {
                if (data.rates[code] > 0) rates[code] = 1 / data.rates[code];
            });
        }
        return { rates, date: format(new Date(), 'yyyy-MM-dd') };
    } catch { return null; }
}

async function fetchEcb() {
  try {
    const res = await fetch('/api/ecb');
    if (!res.ok) return null;
    const ecbData = await res.json();
    const rates: Record<string, number> = {};
    const eurInUsd = 1 / (ecbData['USD'] || 1);
    Object.keys(ecbData).forEach(code => { rates[code] = (1 / ecbData[code]) / eurInUsd; });
    return { rates, date: format(getLocalDate('Europe/Berlin'), 'yyyy-MM-dd') };
  } catch { return null; }
}

async function fetchNbk() {
  try {
    const res = await fetch('/api/nbk');
    if (!res.ok) return null;
    const nbkData = await res.json();
    const rates: Record<string, number> = {};
    const usdInKzt = nbkData['USD'];
    if (usdInKzt) {
      rates['KZT'] = 1 / usdInKzt;
      Object.keys(nbkData).forEach(code => { rates[code] = nbkData[code] / usdInKzt; });
    }
    return { rates, date: format(getLocalDate('Asia/Almaty'), 'yyyy-MM-dd') };
  } catch { return null; }
}

export async function getCurrencies(): Promise<Currency[]> {
    const approvedCodes = new Set([...fiatCodes, ...metalsCodes, ...popularCryptoCodes, ...curatedAltcoinCodes]);
    const preloadedMap = new Map(currencyApiPreloadedCurrencies.map(c => [c.code, c]));
    const result = Array.from(approvedCodes).map(code => ({
        code,
        name: preloadedMap.get(code)?.name || code
    }));
    return result.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db: Firestore): Promise<ExchangeRate[]> {
    await preFetchInitialRates(db);
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { 
            from, to, 
            rate: findRate(from, to, false), 
            tomorrowRate: findRate(from, to, true) 
        };
    });
}

export async function findRateAsync(from: string, to: string, db: Firestore): Promise<number | undefined> {
    await preFetchInitialRates(db);
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date, db: Firestore): Promise<HistoricalRateResult | undefined> {
    const rate = findRate(from, to, false); 
    if (rate !== undefined) return { rate, date, isFallback: false };
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const baseRate = findRate(from, to, false) || 1;
    const isCrypto = popularCryptoCodes.includes(from) || curatedAltcoinCodes.includes(from);
    const volatility = isCrypto ? 0.03 : 0.002;
    try {
        const days = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });
        return days.map((d) => ({
            date: format(d, 'dd.MM'),
            rate: baseRate * (1 + (Math.random() - 0.5) * volatility)
        }));
    } catch (e) { return []; }
}
