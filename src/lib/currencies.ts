import { Currency, ExchangeRate, DataSource, HistoricalRateResult, MultiSourceData } from '@/lib/types';
import { format, addDays, startOfDay, eachDayOfInterval, endOfDay, isAfter } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, collection, addDoc, Firestore, onSnapshot, query, where, getDocs, Timestamp } from 'firebase/firestore';

let activeDataSource: DataSource = 'nbrb';

// Сессионный кэш для предотвращения повторных запросов
const sessionCache = new Map<string, any>();

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

let unifiedData: MultiSourceData = {};
let unifiedDataTomorrow: MultiSourceData = {};

const FIAT_TTL = 5 * 60 * 1000;

export function setDataSource(source: DataSource) { activeDataSource = source; }
export function getDataSource(): DataSource { return activeDataSource; }

/**
 * Global rate finder with cascade logic.
 */
export function findRate(from: string, to: string, isTomorrow: boolean = false): number | undefined {
    if (from === to) return 1;

    const getBestPrice = (currency: string): number | undefined => {
        if (currency === 'USD') return 1; // Base anchor
        const targetMap = isTomorrow ? unifiedDataTomorrow : unifiedData;
        
        // 1. Priority source
        if (targetMap[currency]?.[activeDataSource]) return targetMap[currency][activeDataSource].v;
        
        // 2. Cascade official sources (Important for BYN rescue)
        const officials: DataSource[] = ['nbrb', 'cbr', 'nbk', 'ecb'];
        for (const src of officials) {
            if (targetMap[currency]?.[src]) return targetMap[currency][src].v;
        }
        
        // 3. Commercial
        const commercial: string[] = ['worldcurrencyapi', 'coingecko'];
        for (const src of commercial) {
            if (targetMap[currency]?.[src]) return targetMap[currency][src].v;
        }

        // Handle legacy BYR code mapping
        if (currency === 'BYN' && targetMap['BYR']) {
            const byr = getBestPrice('BYR');
            if (byr) return byr;
        }

        return undefined;
    };

    const fromPrice = getBestPrice(from);
    const toPrice = getBestPrice(to);
    
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
        if (!snap.exists() || (now - (snap.data()?.updatedAtFiat || 0) > FIAT_TTL)) {
            await updateAllRatesInCloud(db, true, onApiError);
        }
    } catch (e) {}
}

/**
 * Enhanced with priority loading: fetch active source first, then others in background.
 */
export async function updateAllRatesInCloud(db: Firestore, updateFiat: boolean = true, onApiError?: (source: string) => void) {
    const now = Date.now();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const sources = [
        { id: 'nbrb', fn: fetchNbrb, type: 'fiat' },
        { id: 'cbr', fn: fetchCbr, type: 'fiat' },
        { id: 'ecb', fn: fetchEcb, type: 'fiat' },
        { id: 'nbk', fn: fetchNbk, type: 'fiat' },
        { id: 'coingecko', fn: fetchCoinGecko, type: 'crypto' },
        { id: 'worldcurrencyapi', fn: fetchWorldCurrency, type: 'fiat' }
    ];

    const activeSources = sources.filter(s => s.type === 'crypto' || updateFiat);
    const prioritySource = activeSources.find(s => s.id === activeDataSource) || activeSources[0];
    const otherSources = activeSources.filter(s => s.id !== prioritySource.id);

    const nextData = { ...unifiedData };
    const nextDataTomorrow = { ...unifiedDataTomorrow };

    const processSourceResult = (val: any, sourceId: string, isOfficial: boolean) => {
        if (!val) return;
        const processEntry = (rates: Record<string, number>, dateStr: string) => {
            // Any date strictly later than today is TOMORROW
            const targetMap = dateStr > todayStr ? nextDataTomorrow : nextData;
            Object.keys(rates).forEach(currency => {
                if (!targetMap[currency]) targetMap[currency] = {};
                targetMap[currency][sourceId] = { v: rates[currency], d: dateStr, off: isOfficial };
            });
        };
        if (val.today) processEntry(val.today.rates, val.today.date);
        if (val.tomorrow) processEntry(val.tomorrow.rates, val.tomorrow.date);
        if (val.rates && val.date) processEntry(val.rates, val.date);
    };

    // 1. Fetch Priority Source FIRST (Fast response for UI)
    try {
        const priorityRes = await prioritySource.fn();
        processSourceResult(priorityRes, prioritySource.id, prioritySource.type === 'fiat');
        
        // Immediate UI Update
        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData, 
            dataTomorrow: nextDataTomorrow, 
            updatedAtFiat: now
        }, { merge: true });
        
        unifiedData = nextData;
        unifiedDataTomorrow = nextDataTomorrow;
    } catch (e) {
        if (onApiError) onApiError(prioritySource.id);
    }

    // 2. Fetch all other sources in background (No await for UI)
    (async () => {
        const results = await Promise.allSettled(otherSources.map(s => s.fn()));
        results.forEach((res, idx) => {
            const sInfo = otherSources[idx];
            if (res.status === 'fulfilled' && res.value) {
                processSourceResult(res.value, sInfo.id, sInfo.type === 'fiat');
            } else if (onApiError) {
                onApiError(sInfo.id);
            }
        });

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData, 
            dataTomorrow: nextDataTomorrow, 
            updatedAtFiat: now
        }, { merge: true });
        
        unifiedData = nextData;
        unifiedDataTomorrow = nextDataTomorrow;
    })();

    return unifiedData;
}

async function fetchNbrb() {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

        console.log(`[NBRB Request] Checking today (${todayStr}) and tomorrow (${tomorrowStr})`);

        const [resT, resTm] = await Promise.all([
            fetch(`https://api.nbrb.by/exrates/rates?ondate=${todayStr}&periodicity=0`, { cache: 'no-store' }),
            fetch(`https://api.nbrb.by/exrates/rates?ondate=${tomorrowStr}&periodicity=0`, { cache: 'no-store' })
        ]);

        const process = async (res: Response) => {
            if (!res.ok) return null;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) return null;
            const r: Record<string, number> = { 'BYN': 1 };
            data.forEach((item: any) => { r[item.Cur_Abbreviation] = item.Cur_OfficialRate / item.Cur_Scale; });
            const usd = r['USD'];
            if (!usd) return null;
            const norm: Record<string, number> = {};
            Object.keys(r).forEach(c => { norm[c] = r[c] / usd; });
            return norm;
        };

        const tRates = await process(resT);
        const tmRates = await process(resTm);

        console.log(`[NBRB Response] Tomorrow provided: ${!!tmRates}`);

        return {
            today: tRates ? { rates: tRates, date: todayStr } : null,
            tomorrow: tmRates ? { rates: tmRates, date: tomorrowStr } : null
        };
    } catch (e) { return null; }
}

async function fetchCbr() {
    try {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const tomStr = format(tomorrow, 'dd/MM/yyyy');
        
        const [resJson, resXml] = await Promise.all([
            fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' }),
            fetch(`/api/cbr/history?date_req=${tomStr}`, { cache: 'no-store' })
        ]);

        const ratesToday: Record<string, number> = {};
        let dateToday = format(today, 'yyyy-MM-dd');

        if (resJson.ok) {
            const data = await resJson.json();
            const rubPerUsd = data?.Valute?.USD?.Value;
            if (rubPerUsd) {
                ratesToday['RUB'] = 1 / rubPerUsd;
                Object.keys(data.Valute).forEach(code => {
                    const v = data.Valute[code];
                    ratesToday[code] = (v.Value / v.Nominal) / rubPerUsd;
                });
            }
            if (data.Date) dateToday = data.Date.split('T')[0];
        }

        const ratesTomorrow: Record<string, number> = {};
        let dateTom = format(tomorrow, 'yyyy-MM-dd');
        
        if (resXml.ok) {
            const data = await resXml.json();
            if (data?.ValCurs?.Valute) {
                const valutes = Array.isArray(data.ValCurs.Valute) ? data.ValCurs.Valute : [data.ValCurs.Valute];
                const usd = valutes.find((v: any) => v.CharCode[0] === 'USD');
                if (usd) {
                    const rubPerUsd = parseFloat(usd.Value[0].replace(',', '.'));
                    ratesTomorrow['RUB'] = 1 / rubPerUsd;
                    valutes.forEach((v: any) => {
                        const code = v.CharCode[0];
                        const val = parseFloat(v.Value[0].replace(',', '.'));
                        const nom = parseInt(v.Nominal[0]);
                        ratesTomorrow[code] = (val / nom) / rubPerUsd;
                    });
                    if (data.ValCurs.$.Date) {
                        const [d, m, y] = data.ValCurs.$.Date.split('.');
                        dateTom = `${y}-${m}-${d}`;
                    }
                }
            }
        }

        return {
            today: { rates: ratesToday, date: dateToday },
            tomorrow: Object.keys(ratesTomorrow).length > 0 ? { rates: ratesTomorrow, date: dateTom } : null
        };
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
            if (data.rates['BYR'] && !data.rates['BYN']) rates['BYN'] = 1 / data.rates['BYR'];
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
    return { rates, date: format(new Date(), 'yyyy-MM-dd') };
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
    return { rates, date: format(new Date(), 'yyyy-MM-dd') };
  } catch { return null; }
}

export async function getCurrencies(): Promise<Currency[]> {
    const approvedCodes = new Set([...fiatCodes, ...metalsCodes, ...popularCryptoCodes, ...curatedAltcoinCodes]);
    const preloadedMap = new Map(currencyApiPreloadedCurrencies.map(c => [c.code, c]));
    return Array.from(approvedCodes).map(code => ({ code, name: preloadedMap.get(code)?.name || code })).sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db: Firestore): Promise<ExchangeRate[]> {
    await preFetchInitialRates(db);
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { 
            from, 
            to, 
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
    await preFetchInitialRates(db);
    const targetDateStr = format(date, 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    // Check local unified cache first for tomorrow/today
    if (targetDateStr >= todayStr) {
        const rate = findRate(from, to, targetDateStr > todayStr);
        if (rate !== undefined) return { rate, date, isFallback: false };
    }

    const dbData = await loadHistoryRange(date, date, db);
    if (dbData[targetDateStr]) {
        const data = dbData[targetDateStr];
        const getP = (c: string) => {
            if (c === 'USD') return 1;
            const officials: DataSource[] = ['nbrb', 'cbr', 'nbk', 'ecb'];
            for (const s of officials) if (data[c]?.[s]) return data[c][s].v;
            return undefined;
        };
        const fP = getP(from);
        const tP = getP(to);
        if (fP && tP) return { rate: fP / tP, date, isFallback: false };
    }

    if (activeDataSource === 'nbrb' || activeDataSource === 'cbr') {
        const liveData = await fetchAndCacheHistorical(date, db);
        if (liveData) {
            const getP = (c: string) => {
                if (c === 'USD') return 1;
                if (liveData[c]?.[activeDataSource]) return liveData[c][activeDataSource].v;
                return undefined;
            };
            const fP = getP(from);
            const tP = getP(to);
            if (fP && tP) return { rate: fP / tP, date, isFallback: false };
        }
    }
    
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date, db: Firestore): Promise<{ date: string; rate: number }[]> {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const results: { date: string; rate: number }[] = [];
    for (const d of days) {
        const res = await getHistoricalRate(from, to, d, db);
        if (res) results.push({ date: format(d, 'dd.MM'), rate: res.rate });
    }
    return results;
}

async function loadHistoryRange(from: Date, to: Date, db: Firestore): Promise<Record<string, MultiSourceData>> {
    const results: Record<string, MultiSourceData> = {};
    try {
        const q = query(
            collection(db, 'rates_history'),
            where('timestamp', '>=', Timestamp.fromDate(startOfDay(from))),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay(to)))
        );
        const snap = await getDocs(q);
        snap.docs.forEach(doc => {
            const d = doc.data();
            const dateKey = format(d.timestamp.toDate(), 'yyyy-MM-dd');
            results[dateKey] = d.data;
        });
    } catch (e) {}
    return results;
}

async function fetchAndCacheHistorical(date: Date, db: Firestore): Promise<MultiSourceData | null> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = `hist-${dateStr}-${activeDataSource}`;
    if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

    if (activeDataSource !== 'nbrb' && activeDataSource !== 'cbr') return null;

    const rates = await (activeDataSource === 'nbrb' 
        ? (async (d: Date) => { 
            const dStr = format(d, 'yyyy-MM-dd');
            const res = await fetch(`https://api.nbrb.by/exrates/rates?ondate=${dStr}&periodicity=0`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) return null;
            const r: Record<string, number> = { 'BYN': 1 };
            data.forEach((item: any) => { r[item.Cur_Abbreviation] = item.Cur_OfficialRate / item.Cur_Scale; });
            const usd = r['USD'];
            if (!usd) return null;
            const norm: Record<string, number> = {};
            Object.keys(r).forEach(c => { norm[c] = r[c] / usd; });
            return norm;
          })(date)
        : (async (d: Date) => {
            const dateStrCbr = format(d, 'dd/MM/yyyy');
            const res = await fetch(`/api/cbr/history?date_req=${dateStrCbr}`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            if (data?.ValCurs?.Valute) {
                const rates: Record<string, number> = {};
                const valutes = Array.isArray(data.ValCurs.Valute) ? data.ValCurs.Valute : [data.ValCurs.Valute];
                const usd = valutes.find((v: any) => v.CharCode[0] === 'USD');
                if (usd) {
                    const rubPerUsd = parseFloat(usd.Value[0].replace(',', '.'));
                    rates['RUB'] = 1 / rubPerUsd;
                    valutes.forEach((v: any) => {
                        const code = v.CharCode[0];
                        const val = parseFloat(v.Value[0].replace(',', '.'));
                        const nom = parseInt(v.Nominal[0]);
                        rates[code] = (val / nom) / rubPerUsd;
                    });
                    return rates;
                }
            }
            return null;
        })(date));

    if (rates) {
        const historicalData: MultiSourceData = {};
        Object.keys(rates).forEach(currency => {
            historicalData[currency] = { [activeDataSource]: { v: rates[currency], d: dateStr, off: true } };
        });
        try {
            await addDoc(collection(db, 'rates_history'), {
                timestamp: Timestamp.fromDate(startOfDay(date)),
                base: 'USD', data: historicalData
            });
        } catch {}
        sessionCache.set(cacheKey, historicalData);
        return historicalData;
    }
    return null;
}
