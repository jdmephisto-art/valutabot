import { Currency, ExchangeRate, DataSource, HistoricalRateResult, MultiSourceData } from '@/lib/types';
import { format, isSameDay, addDays, startOfDay, eachDayOfInterval, parseISO, endOfDay } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, collection, addDoc, Firestore, onSnapshot, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';

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

/**
 * Поиск курса для Конвертера и Списков.
 */
export function findRate(from: string, to: string, isTomorrow: boolean = false): number | undefined {
    if (from === to) return 1;
    const tz = sourceTimezones[activeDataSource] || 'UTC';
    const targetDateStr = format(getLocalDate(tz, isTomorrow ? 1 : 0), 'yyyy-MM-dd');

    const getBestPrice = (currency: string): number | undefined => {
        const trySpecific = (source: string, map: MultiSourceData): number | undefined => {
            const entry = map[currency]?.[source];
            // Для "завтра" требуем строгого соответствия даты. Для "сегодня" берем последнее доступное.
            if (entry && (!isTomorrow || entry.d === targetDateStr)) return entry.v;
            return undefined;
        };

        let val = trySpecific(activeDataSource, isTomorrow ? unifiedDataTomorrow : unifiedData);
        if (val !== undefined) return val;

        // Резервные источники (только для "сегодня")
        if (!isTomorrow) {
            const marketEntry = unifiedData[currency]?.['worldcurrencyapi'] || unifiedData[currency]?.['coingecko'];
            if (marketEntry) return marketEntry.v;
        }
        return undefined;
    };

    const fromPrice = getBestPrice(from);
    const toPrice = getBestPrice(to);
    if (fromPrice !== undefined && toPrice !== undefined && toPrice !== 0) return fromPrice / toPrice;
    return undefined;
}

/**
 * Строгий поиск курса по источнику и дате.
 */
function strictRateLookup(data: MultiSourceData, currency: string, targetDateStr: string): number | undefined {
    if (currency === 'USD') return 1;
    
    const entry = data[currency]?.[activeDataSource];
    if (entry && entry.d === targetDateStr) return entry.v;
    
    for (const src of Object.keys(data[currency] || {})) {
        const e = data[currency][src];
        if (e && e.d === targetDateStr) return e.v;
    }
    
    return undefined;
}

export async function preFetchInitialRates(db: Firestore, onApiError?: (source: string) => void) {
    const docRef = doc(db, 'rates_cache', 'unified');
    onSnapshot(docRef, 
        (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                unifiedData = data.data || {};
                unifiedDataTomorrow = data.dataTomorrow || {};
            }
        }
    );
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

                const tz = sourceTimezones[sourceInfo.id] || 'UTC';
                const tomorrowStr = format(getLocalDate(tz, 1), 'yyyy-MM-dd');

                const val = res.value as any;
                if (val.today && val.today.rates) {
                    processEntry(val.today.rates, val.today.date, nextData);
                }
                if (val.tomorrow && val.tomorrow.rates) {
                    processEntry(val.tomorrow.rates, val.tomorrow.date, nextDataTomorrow);
                }
                
                // Обработка одиночных ответов (не диапазонных)
                if (val.rates && val.date) {
                    if (val.date === tomorrowStr) {
                        processEntry(val.rates, val.date, nextDataTomorrow);
                    } else {
                        processEntry(val.rates, val.date, nextData);
                    }
                }
            } else if (onApiError) onApiError(sourceInfo.id);
        });

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData, dataTomorrow: nextDataTomorrow, updatedAtFiat: now, sources_updated: updatedSources
        }, { merge: true });
        
        await addDoc(collection(db, 'rates_history'), {
            timestamp: serverTimestamp(), base: 'USD', data: nextData, dataTomorrow: nextDataTomorrow
        });
        
        unifiedData = nextData; unifiedDataTomorrow = nextDataTomorrow;
        return unifiedData;
    } catch (e) { return unifiedData; }
}

async function fetchNbrbHistoricalRange(from: Date, to: Date) {
    const fromStr = format(from, 'yyyy-MM-dd');
    const toStr = format(to, 'yyyy-MM-dd');
    try {
        const res = await fetch(`https://api.nbrb.by/exrates/rates/dynamics/431?startDate=${fromStr}&endDate=${toStr}`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const results: Record<string, Record<string, number>> = {};
        data.forEach((entry: any) => {
            const dateKey = entry.Date.split('T')[0];
            results[dateKey] = { 'USD': 1, 'BYN': 1 / entry.Cur_OfficialRate };
        });
        return results;
    } catch { return null; }
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

    const sourceFn = activeDataSource === 'nbrb' 
        ? async (d: Date) => { 
            const dStr = format(d, 'yyyy-MM-dd');
            const res = await fetch(`https://api.nbrb.by/exrates/rates?ondate=${dStr}&periodicity=0`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            const r: Record<string, number> = { 'BYN': 1 };
            data.forEach((item: any) => { r[item.Cur_Abbreviation] = item.Cur_OfficialRate / item.Cur_Scale; });
            const usd = r['USD'];
            if (!usd) return null;
            const norm: Record<string, number> = {};
            Object.keys(r).forEach(c => { norm[c] = r[c] / usd; });
            return norm;
          }
        : fetchCbrHistorical;

    const rates = await sourceFn(date);
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

async function fetchNbrb() {
    try {
        const tz = sourceTimezones['nbrb'];
        const todayStr = format(getLocalDate(tz, 0), 'yyyy-MM-dd');
        const tomorrowStr = format(getLocalDate(tz, 1), 'yyyy-MM-dd');

        const [resT, resTm] = await Promise.all([
            fetch(`https://api.nbrb.by/exrates/rates?ondate=${todayStr}&periodicity=0`, { cache: 'no-store' }),
            fetch(`https://api.nbrb.by/exrates/rates?ondate=${tomorrowStr}&periodicity=0`, { cache: 'no-store' })
        ]);

        const process = async (res: Response) => {
            if (!res.ok) return null;
            const data = await res.json();
            const r: Record<string, number> = { 'BYN': 1 };
            data.forEach((item: any) => { r[item.Cur_Abbreviation] = item.Cur_OfficialRate / item.Cur_Scale; });
            const usd = r['USD'];
            if (!usd) return null;
            const norm: Record<string, number> = {};
            Object.keys(r).forEach(c => { norm[c] = r[c] / usd; });
            return norm;
        };

        const todayRates = await process(resT);
        const tomorrowRates = await process(resTm);

        return {
            today: todayRates ? { rates: todayRates, date: todayStr } : null,
            tomorrow: tomorrowRates ? { rates: tomorrowRates, date: tomorrowStr } : null
        };
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

/**
 * Получение курса на дату (Strict Mode).
 */
export async function getHistoricalRate(from: string, to: string, date: Date, db: Firestore): Promise<HistoricalRateResult | undefined> {
    await preFetchInitialRates(db);
    const tz = sourceTimezones[activeDataSource] || 'UTC';
    const targetDateStr = format(date, 'yyyy-MM-dd');
    const localTomorrow = getLocalDate(tz, 1);
    const tomorrowStr = format(localTomorrow, 'yyyy-MM-dd');

    // Приоритет оперативного кэша для "завтра"
    if (targetDateStr === tomorrowStr) {
        const fromP = strictRateLookup(unifiedDataTomorrow, from, tomorrowStr);
        const toP = strictRateLookup(unifiedDataTomorrow, to, tomorrowStr);
        if (fromP && toP) return { rate: fromP / toP, date, isFallback: false };
    }

    // Поиск в БД Архива
    const dbData = await loadHistoryRange(date, date, db);
    const snap = dbData[targetDateStr];
    if (snap) {
        const fromP = strictRateLookup(snap, from, targetDateStr);
        const toP = strictRateLookup(snap, to, targetDateStr);
        if (fromP && toP) return { rate: fromP / toP, date, isFallback: false };
    }

    // Если в БД нет - только честный запрос в Архив API
    const liveData = await fetchAndCacheHistorical(date, db);
    if (liveData) {
        const fromP = strictRateLookup(liveData, from, targetDateStr);
        const toP = strictRateLookup(liveData, to, targetDateStr);
        if (fromP && toP) return { rate: fromP / toP, date, isFallback: false };
    }
    
    return undefined;
}

/**
 * Динамика за период (Strict Mode).
 */
export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date, db: Firestore): Promise<{ date: string; rate: number }[]> {
    const cacheKey = `dyn-${from}-${to}-${format(startDate, 'yyyyMMdd')}-${format(endDate, 'yyyyMMdd')}-${activeDataSource}`;
    if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const dbData = await loadHistoryRange(startDate, endDate, db);
    
    const tz = sourceTimezones[activeDataSource] || 'UTC';
    const tomorrowStr = format(getLocalDate(tz, 1), 'yyyy-MM-dd');

    // Пакетная дозагрузка отсутствующих дат
    const missing = days.filter(d => !dbData[format(d, 'yyyy-MM-dd')]);
    if (missing.length > 0 && (activeDataSource === 'nbrb' || activeDataSource === 'cbr')) {
        await Promise.all(missing.map(d => fetchAndCacheHistorical(d, db)));
        const updated = await loadHistoryRange(startDate, endDate, db);
        Object.assign(dbData, updated);
    }

    const results: { date: string; rate: number }[] = [];

    for (const d of days) {
        const dateStr = format(d, 'yyyy-MM-dd');
        let rate: number | undefined;

        const snap = dbData[dateStr];
        if (snap) {
            const fromP = strictRateLookup(snap, from, dateStr);
            const toP = strictRateLookup(snap, to, dateStr);
            if (fromP && toP) rate = fromP / toP;
        }

        // Если это завтра и его нет в БД - берем из оперативного кэша
        if (rate === undefined && dateStr === tomorrowStr) {
            const fromP = strictRateLookup(unifiedDataTomorrow, from, tomorrowStr);
            const toP = strictRateLookup(unifiedDataTomorrow, to, tomorrowStr);
            if (fromP && toP) rate = fromP / toP;
        }

        if (rate !== undefined) {
            results.push({ date: format(d, 'dd.MM'), rate });
        }
    }
    
    if (results.length > 0) sessionCache.set(cacheKey, results);
    return results;
}