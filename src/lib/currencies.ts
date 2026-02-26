import { Currency, ExchangeRate, DataSource, HistoricalRateResult, MultiSourceData } from '@/lib/types';
import { format, isAfter, isBefore, isSameDay, addDays, startOfDay, eachDayOfInterval, parseISO, subDays, endOfDay } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, collection, addDoc, Firestore, onSnapshot, serverTimestamp, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';

let activeDataSource: DataSource = 'nbrb';

// Сессионный кэш для предотвращения повторных запросов в рамках одной сессии
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

const FIAT_TTL = 30 * 60 * 1000;

const sourceTimezones: Record<string, string> = {
    'nbrb': 'Europe/Minsk',
    'cbr': 'Europe/Moscow',
    'nbk': 'Asia/Almaty',
    'ecb': 'Europe/Berlin',
};

function getLocalDate(timezone: string, offsetDays = 0): Date {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false
    });
    const parts = formatter.formatToParts(now);
    const dateMap: any = {};
    parts.forEach(p => dateMap[p.type] = p.value);
    const localDate = new Date(Date.UTC(parseInt(dateMap.year), parseInt(dateMap.month) - 1, parseInt(dateMap.day)));
    if (offsetDays !== 0) localDate.setUTCDate(localDate.getUTCDate() + offsetDays);
    return localDate;
}

export function setDataSource(source: DataSource) { activeDataSource = source; }
export function getDataSource(): DataSource { return activeDataSource; }

export function findRate(from: string, to: string, isTomorrow: boolean = false): number | undefined {
    if (from === to) return 1;
    const tz = sourceTimezones[activeDataSource] || 'UTC';
    const targetDateStr = format(getLocalDate(tz, isTomorrow ? 1 : 0), 'yyyy-MM-dd');
    const todayStr = format(getLocalDate(tz, 0), 'yyyy-MM-dd');

    const getBestPrice = (currency: string, target: string): number | undefined => {
        const trySpecific = (source: string, map: MultiSourceData): number | undefined => {
            const entry = map[currency]?.[source];
            if (entry && entry.d === target) return entry.v;
            return undefined;
        };

        let val = trySpecific(activeDataSource, unifiedDataTomorrow) || trySpecific(activeDataSource, unifiedData);
        if (val !== undefined) return val;

        const isOfficialCurrency = ['BYN', 'RUB', 'KZT', 'EUR'].includes(currency);
        if (isOfficialCurrency) {
            const candidates: { v: number, d: string }[] = [];
            [unifiedData, unifiedDataTomorrow].forEach(map => {
                if (map[currency]) Object.values(map[currency]).forEach(e => { if (e.off) candidates.push(e); });
            });
            if (candidates.length > 0) {
                if (target >= todayStr) {
                    const futureOnes = candidates.filter(c => c.d >= target).sort((a, b) => a.d.localeCompare(b.d));
                    if (futureOnes.length > 0) return futureOnes[0].v;
                }
                const pastOnes = candidates.filter(c => c.d <= target).sort((a, b) => b.d.localeCompare(a.d));
                if (pastOnes.length > 0) return pastOnes[0].v;
            }
        }
        const marketEntry = unifiedData[currency]?.['worldcurrencyapi'] || unifiedData[currency]?.['coingecko'];
        if (marketEntry) return marketEntry.v;
        return undefined;
    };

    const fromPrice = getBestPrice(from, targetDateStr);
    const toPrice = getBestPrice(to, targetDateStr);
    if (fromPrice !== undefined && toPrice !== undefined && toPrice !== 0) return fromPrice / toPrice;
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
        if (!snap.exists() || (now - (data?.updatedAtFiat || 0) > FIAT_TTL)) {
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
                        targetMap[currency][sourceInfo.id] = { v: rates[currency], d: dateStr, off: sourceInfo.type === 'fiat' };
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
            } else if (onApiError) onApiError(sourceInfo.id);
        });

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData, dataTomorrow: nextDataTomorrow, updatedAtFiat: now, sources_updated: updatedSources
        }, { merge: true });
        
        await addDoc(collection(db, 'rates_history'), {
            timestamp: serverTimestamp(), base: 'USD', data: nextData, dataTomorrow: nextDataTomorrow, sources_updated: updatedSources
        });
        unifiedData = nextData; unifiedDataTomorrow = nextDataTomorrow;
        return unifiedData;
    } catch (e) { return unifiedData; }
}

// --- Historical & Optimization Helpers ---

async function fetchNbrbHistorical(d: Date) {
    const dateStr = format(d, 'yyyy-MM-dd');
    try {
        const res = await fetch(`https://api.nbrb.by/exrates/rates?periodicity=0&ondate=${dateStr}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        const usd = data.find((r: any) => r.Cur_Abbreviation === 'USD');
        if (usd) {
            const usdInByn = usd.Cur_OfficialRate / usd.Cur_Scale;
            data.forEach((r: any) => { rates[r.Cur_Abbreviation] = (r.Cur_OfficialRate / r.Cur_Scale) / usdInByn; });
            rates['BYN'] = 1 / usdInByn;
            return rates;
        }
    } catch { return null; }
    return null;
}

async function fetchCbrHistorical(d: Date) {
    const dateStr = format(d, 'dd/MM/yyyy');
    try {
        const res = await fetch(`/api/cbr/history?date_req=${dateStr}`, { cache: 'no-store' });
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
    } catch { return null; }
    return null;
}

/**
 * Hybrid DB + API Range Loader (Batch)
 */
async function loadHistoryRange(from: Date, to: Date, db: Firestore): Promise<Record<string, MultiSourceData>> {
    const results: Record<string, MultiSourceData> = {};
    
    // 1. One-shot Firestore query
    try {
        const q = query(
            collection(db, 'rates_history'),
            where('timestamp', '>=', Timestamp.fromDate(startOfDay(from))),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay(to))),
            orderBy('timestamp', 'asc')
        );
        const snap = await getDocs(q);
        snap.forEach(doc => {
            const d = doc.data();
            const dateKey = format(d.timestamp.toDate(), 'yyyy-MM-dd');
            if (!results[dateKey]) results[dateKey] = d.data;
        });
    } catch (e) { console.error("History Batch Error:", e); }

    return results;
}

async function fetchAndCacheHistorical(date: Date, db: Firestore): Promise<MultiSourceData | null> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = `hist-${dateStr}`;
    if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

    const existing = await loadHistoryRange(date, date, db);
    if (existing[dateStr]) {
        sessionCache.set(cacheKey, existing[dateStr]);
        return existing[dateStr];
    }

    const sources = [
        { id: 'nbrb', fn: fetchNbrbHistorical },
        { id: 'cbr', fn: fetchCbrHistorical }
    ];
    const results = await Promise.allSettled(sources.map(s => s.fn(date)));
    const historicalData: MultiSourceData = {};
    let hasData = false;

    results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value) {
            hasData = true;
            Object.keys(res.value).forEach(currency => {
                if (!historicalData[currency]) historicalData[currency] = {};
                historicalData[currency][sources[idx].id] = { v: res.value![currency], d: dateStr, off: true };
            });
        }
    });

    if (hasData) {
        try {
            await addDoc(collection(db, 'rates_history'), {
                timestamp: Timestamp.fromDate(startOfDay(date)),
                base: 'USD', data: historicalData, is_historical_fill: true
            });
        } catch {}
        sessionCache.set(cacheKey, historicalData);
        return historicalData;
    }
    return null;
}

// --- End Helpers ---

async function fetchNbrb() {
    try {
        const tz = sourceTimezones['nbrb'];
        const todayRates = await fetchNbrbHistorical(getLocalDate(tz));
        const tomorrowRates = await fetchNbrbHistorical(getLocalDate(tz, 1));
        const today = todayRates ? { rates: todayRates, date: format(getLocalDate(tz), 'yyyy-MM-dd') } : null;
        const tomorrow = tomorrowRates ? { rates: tomorrowRates, date: format(getLocalDate(tz, 1), 'yyyy-MM-dd') } : null;
        return today ? { today, tomorrow: tomorrow || today } : null;
    } catch { return null; }
}

async function fetchCbr() {
    try {
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
        const dateStr = data.Date ? parseISO(data.Date).toISOString().split('T')[0] : format(new Date(), 'yyyy-MM-dd');
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
        if (data?.rates) Object.keys(data.rates).forEach(code => { if (data.rates[code] > 0) rates[code] = 1 / data.rates[code]; });
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
    return Array.from(approvedCodes).map(code => ({ code, name: preloadedMap.get(code)?.name || code })).sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db: Firestore): Promise<ExchangeRate[]> {
    await preFetchInitialRates(db);
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to, rate: findRate(from, to, false), tomorrowRate: findRate(from, to, true) };
    });
}

export async function findRateAsync(from: string, to: string, db: Firestore): Promise<number | undefined> {
    await preFetchInitialRates(db);
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date, db: Firestore): Promise<HistoricalRateResult | undefined> {
    await preFetchInitialRates(db);
    const tz = sourceTimezones[activeDataSource] || 'UTC';
    const localToday = getLocalDate(tz, 0);
    const localTomorrow = getLocalDate(tz, 1);
    
    if (isSameDay(date, localToday)) {
        const r = findRate(from, to, false);
        if (r) return { rate: r, date, isFallback: false };
    }
    if (isSameDay(date, localTomorrow)) {
        const r = findRate(from, to, true);
        if (r) return { rate: r, date, isFallback: false };
    }

    const data = await fetchAndCacheHistorical(date, db);
    if (data) {
        const fromP = data[from]?.[activeDataSource]?.v || data[from]?.['worldcurrencyapi']?.v;
        const toP = data[to]?.[activeDataSource]?.v || data[to]?.['worldcurrencyapi']?.v;
        if (fromP && toP) return { rate: fromP / toP, date, isFallback: false };
    }
    return undefined;
}

/**
 * Highly Optimized Dynamics Fetcher
 */
export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date, db: Firestore): Promise<{ date: string; rate: number }[]> {
    const cacheKey = `dyn-${from}-${to}-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}-${activeDataSource}`;
    if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

    try {
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        
        // 1. Batch Load from Firestore
        const dbData = await loadHistoryRange(startDate, endDate, db);
        
        // 2. Identify missing dates
        const missingDates = days.filter(d => !dbData[format(d, 'yyyy-MM-dd')]);
        
        // 3. Parallel fetch for missing dates (only for banks)
        if (missingDates.length > 0 && (activeDataSource === 'nbrb' || activeDataSource === 'cbr')) {
            await Promise.all(missingDates.map(d => fetchAndCacheHistorical(d, db)));
            // Refresh DB data after parallel fetch
            const updatedDbData = await loadHistoryRange(startDate, endDate, db);
            Object.assign(dbData, updatedDbData);
        }

        const results: { date: string; rate: number }[] = [];
        let lastKnownRate = 1;

        for (const d of days) {
            const dateStr = format(d, 'yyyy-MM-dd');
            const snap = dbData[dateStr];
            
            let rate: number | undefined;
            if (snap) {
                const fromP = snap[from]?.[activeDataSource]?.v || snap[from]?.['worldcurrencyapi']?.v;
                const toP = snap[to]?.[activeDataSource]?.v || snap[to]?.['worldcurrencyapi']?.v;
                if (fromP && toP) rate = fromP / toP;
            }

            if (rate === undefined) {
                // Fallback to today/tomorrow logic if within range
                const hist = await getHistoricalRate(from, to, d, db);
                if (hist) rate = hist.rate;
            }

            if (rate !== undefined) {
                results.push({ date: format(d, 'dd.MM'), rate });
                lastKnownRate = rate;
            } else {
                results.push({ date: format(d, 'dd.MM'), rate: lastKnownRate });
            }
        }
        
        sessionCache.set(cacheKey, results);
        return results;
    } catch (e) { 
        console.error("Dynamics Fetch Error:", e);
        return []; 
    }
}
