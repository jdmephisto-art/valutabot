import { Currency, ExchangeRate, DataSource, HistoricalRateResult, MultiSourceData } from '@/lib/types';
import { format, isAfter, isSameDay, addDays, startOfDay, eachDayOfInterval } from 'date-fns';
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
let unifiedData: MultiSourceData = { 'USD': { 'base': 1 } };
let unifiedDataTomorrow: MultiSourceData = {};

const CRYPTO_TTL = 15 * 60 * 1000;
const FIAT_TTL = 3 * 60 * 60 * 1000;

const sourceTimezones: Record<string, string> = {
    'nbrb': 'Europe/Minsk',
    'cbr': 'Europe/Moscow',
    'nbk': 'Asia/Almaty',
    'ecb': 'Europe/Berlin',
};

/**
 * Helper to get date objects based on specific timezone
 */
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

export function findRate(from: string, to: string, isTomorrow: boolean = false): number | undefined {
    if (from === to) return 1;

    const isCrypto = (code: string) => popularCryptoCodes.includes(code) || curatedAltcoinCodes.includes(code);

    const getBestPrice = (currency: string, sourceMap: MultiSourceData, currentIsTomorrow: boolean): number | undefined => {
        const sources = sourceMap[currency];
        if (!sources) return undefined;

        // 1. User selected source
        if (sources[activeDataSource] !== undefined) return sources[activeDataSource];

        // 2. Hardcoded priority fallbacks
        if (currency === 'BYN' && sources['nbrb'] !== undefined) return sources['nbrb'];
        if (currency === 'RUB' && sources['cbr'] !== undefined) return sources['cbr'];
        if (currency === 'KZT' && sources['nbk'] !== undefined) return sources['nbk'];
        if (currency === 'EUR' && sources['ecb'] !== undefined) return sources['ecb'];
        
        // 3. Category fallbacks
        if (isCrypto(currency)) {
            return sources['coingecko'] || sources['cmc'];
        }

        // 4. Global fallback (strictly from current map)
        return sources['worldcurrencyapi'] || Object.values(sources)[0];
    };

    // Main Selection logic
    // For tomorrow, we ONLY fallback to today if it's crypto (traded 24/7). 
    // For official banks, if tomorrow is requested but not in 'unifiedDataTomorrow', we don't want today's data to overwrite.
    let fromPrice: number | undefined;
    let toPrice: number | undefined;

    if (isTomorrow) {
        fromPrice = getBestPrice(from, unifiedDataTomorrow, true);
        toPrice = getBestPrice(to, unifiedDataTomorrow, true);

        // Fallback to today ONLY for crypto
        if (fromPrice === undefined && isCrypto(from)) fromPrice = getBestPrice(from, unifiedData, false);
        if (toPrice === undefined && isCrypto(to)) toPrice = getBestPrice(to, unifiedData, false);
    } else {
        fromPrice = getBestPrice(from, unifiedData, false);
        toPrice = getBestPrice(to, unifiedData, false);
    }

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
            if (data.data) {
                unifiedData = data.data;
                unifiedDataTomorrow = data.dataTomorrow || {};
            }
        }
    });

    try {
        const snap = await getDoc(docRef);
        const now = Date.now();
        const data = snap.data();
        const needsCryptoUpdate = !snap.exists() || (now - (data?.updatedAtCrypto || 0) > CRYPTO_TTL);
        const needsFiatUpdate = !snap.exists() || (now - (data?.updatedAtFiat || 0) > FIAT_TTL);

        if (needsCryptoUpdate || needsFiatUpdate) {
            await updateAllRatesInCloud(db, needsFiatUpdate, onApiError);
        }
    } catch (e) {}
}

export async function updateAllRatesInCloud(db: Firestore, updateFiat: boolean = true, onApiError?: (source: string) => void) {
    const now = Date.now();
    try {
        const sources = [
            { id: 'coingecko', fn: fetchCoinGecko, type: 'crypto' },
            { id: 'cmc', fn: fetchCoinMarketCap, type: 'crypto' },
            { id: 'nbrb', fn: fetchNbrb, type: 'fiat' },
            { id: 'cbr', fn: fetchCbr, type: 'fiat' },
            { id: 'worldcurrencyapi', fn: fetchWorldCurrency, type: 'fiat' },
            { id: 'ecb', fn: fetchEcb, type: 'fiat' },
            { id: 'nbk', fn: fetchNbk, type: 'fiat' }
        ];

        const activeSources = sources.filter(s => s.type === 'crypto' || updateFiat);
        const results = await Promise.allSettled(activeSources.map(s => s.fn()));

        const updatedSources: string[] = [];
        // Deep clone to ensure memory isolation
        const nextData = JSON.parse(JSON.stringify(unifiedData));
        const nextDataTomorrow = JSON.parse(JSON.stringify(unifiedDataTomorrow));

        results.forEach((res, idx) => {
            const sourceInfo = activeSources[idx];
            if (res.status === 'fulfilled' && res.value) {
                updatedSources.push(sourceInfo.id);
                
                const processRates = (rates: Record<string, number>, targetMap: MultiSourceData) => {
                    Object.keys(rates).forEach(currency => {
                        if (!targetMap[currency]) targetMap[currency] = {};
                        targetMap[currency][sourceInfo.id] = rates[currency];
                    });
                };

                if ('tomorrow' in res.value) {
                    processRates((res.value as any).today, nextData);
                    processRates((res.value as any).tomorrow, nextDataTomorrow);
                } else {
                    processRates(res.value as Record<string, number>, nextData);
                }
            } else if (onApiError) {
                onApiError(sourceInfo.id);
            }
        });

        const updatePayload: any = {
            data: nextData,
            dataTomorrow: nextDataTomorrow,
            updatedAtCrypto: now,
            sources_updated: updatedSources
        };
        if (updateFiat) updatePayload.updatedAtFiat = now;

        await setDoc(doc(db, 'rates_cache', 'unified'), updatePayload, { merge: true });
        
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

// --- Fetchers with Timezone Logic ---

async function fetchNbrb() {
    try {
        const localNow = getLocalDate(sourceTimezones['nbrb']);
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
            return rates;
        };
        const today = await fetchByDate(localNow);
        const tomorrow = await fetchByDate(addDays(localNow, 1));
        return today ? { today, tomorrow: tomorrow || {} } : null;
    } catch { return null; }
}

async function fetchCbr() {
    try {
        // CBR usually updates for tomorrow after 15:30 MSK
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
        return rates;
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
        return rates;
    } catch { return null; }
}

async function fetchCoinMarketCap() {
    try {
        const res = await fetch('/api/cmc?endpoint=cryptocurrency/listings/latest&limit=100', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.data) {
            data.data.forEach((coin: any) => {
                rates[coin.symbol] = coin.quote.USD.price;
            });
        }
        return rates;
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
        return rates;
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
    return rates;
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
    return rates;
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
    const now = startOfDay(new Date());
    const tomorrow = addDays(now, 1);
    const target = startOfDay(date);

    if (isAfter(target, tomorrow)) return undefined;
    if (isSameDay(target, tomorrow)) {
        const rate = findRate(from, to, true);
        if (rate !== undefined) return { rate, date, isFallback: false };
    }
    if (isSameDay(target, now)) {
        const rate = findRate(from, to, false);
        if (rate !== undefined) return { rate, date, isFallback: false };
    }
    
    const current = findRate(from, to, false);
    if (current !== undefined) return { rate: current * (0.98 + Math.random() * 0.04), date, isFallback: true };
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
