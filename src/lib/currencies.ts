import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';

let activeDataSource: DataSource = 'nbrb';

// --- Constants ---
export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BTG', 'DASH', 'EOS', 'XAU', 'XAG', 'XPT', 'XPD'];
const metalCodes = ['XAU', 'XAG', 'XPT', 'XPD'];
const actualCrypto = cryptoCodes.filter(c => !metalCodes.includes(c));
const metalMap: Record<string, string> = { 'XAU': '1', 'XAG': '2', 'XPT': '3', 'XPD': '4' };

const CACHE_TTL_RATES = 15 * 60 * 1000; // 15 minutes

// --- Caches ---
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};
let nbrbRatesTimestamp = 0;
let currencyApiRatesCache: { [key: string]: number } = {};
let currencyApiRatesTimestamp = 0;
let cbrRatesCache: any | null = null;
let cbrRatesTimestamp = 0;
let cbrMetalsCache: Record<string, number> = {};
let cbrMetalsTimestamp = 0;
let fixerRatesCache: { [key: string]: number } = {};
let fixerRatesTimestamp = 0;
let coinlayerRatesCache: { [key: string]: number } = {};
let coinlayerRatesTimestamp = 0;

const historicalCache = new Map<string, number>();

// --- Promise Gates ---
let nbrbUpdatePromise: Promise<void> | null = null;
let currencyApiUpdatePromise: Promise<void> | null = null;
let cbrUpdatePromise: Promise<void> | null = null;
let cbrMetalsUpdatePromise: Promise<void> | null = null;
let fixerUpdatePromise: Promise<void> | null = null;
let coinlayerUpdatePromise: Promise<void> | null = null;

function isCacheValid(timestamp: number, ttl: number): boolean {
    return timestamp > 0 && (Date.now() - timestamp) < ttl;
}

export function setDataSource(source: DataSource) {
    if (source !== activeDataSource) {
        activeDataSource = source;
    }
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

async function currencyApiNetFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/currency?${queryParams.toString()}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) return null;
        const data = await response.json();
        return data.valid === false ? null : data;
    } catch {
        return null;
    }
}

async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function cbrApiFetch() {
    try {
        const response = await fetch(`/api/cbr`);
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function fixerApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/fixer?${queryParams.toString()}`;
    try {
        const response = await fetch(url);
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function coinlayerApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/coinlayer?${queryParams.toString()}`;
    try {
        const response = await fetch(url);
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

function _updateNbrbRatesCache(): Promise<void> {
    if (isCacheValid(nbrbRatesTimestamp, CACHE_TTL_RATES) && Object.keys(nbrbRatesCache).length > 0) return Promise.resolve();
    if (nbrbUpdatePromise) return nbrbUpdatePromise;
    nbrbUpdatePromise = (async () => {
        try {
            const data = await nbrbApiFetch('rates?periodicity=0');
            if (data && Array.isArray(data)) {
                const temp: any = {};
                data.forEach((r: any) => {
                    if (r.Cur_Abbreviation) {
                        temp[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
                    }
                });
                nbrbRatesCache = temp;
                nbrbRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error("Failed to update NBRB cache", e);
        } finally {
            nbrbUpdatePromise = null;
        }
    })();
    return nbrbUpdatePromise;
}

function _updateCurrencyApiRatesCache(): Promise<void> {
    if (isCacheValid(currencyApiRatesTimestamp, CACHE_TTL_RATES) && Object.keys(currencyApiRatesCache).length > 0) return Promise.resolve();
    if (currencyApiUpdatePromise) return currencyApiUpdatePromise;
    currencyApiUpdatePromise = (async () => {
        try {
            const data = await currencyApiNetFetch('rates', { base: 'USD' });
            if (data?.rates) {
                currencyApiRatesCache = data.rates;
                currencyApiRatesCache['USD'] = 1;
                currencyApiRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error("Failed to update CurrencyAPI cache", e);
        } finally {
            currencyApiUpdatePromise = null;
        }
    })();
    return currencyApiUpdatePromise;
}

function _updateCbrRatesCache(): Promise<void> {
    if (isCacheValid(cbrRatesTimestamp, CACHE_TTL_RATES) && cbrRatesCache) return Promise.resolve();
    if (cbrUpdatePromise) return cbrUpdatePromise;
    cbrUpdatePromise = (async () => {
        try {
            const data = await cbrApiFetch();
            if (data?.Valute) {
                cbrRatesCache = data;
                cbrRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error("Failed to update CBR cache", e);
        } finally {
            cbrUpdatePromise = null;
        }
    })();
    return cbrUpdatePromise;
}

function _updateCbrMetalsCache(): Promise<void> {
    if (isCacheValid(cbrMetalsTimestamp, CACHE_TTL_RATES) && Object.keys(cbrMetalsCache).length > 0) return Promise.resolve();
    if (cbrMetalsUpdatePromise) return cbrMetalsUpdatePromise;
    cbrMetalsUpdatePromise = (async () => {
        try {
            const response = await fetch('/api/cbr/metals');
            if (response.ok) {
                const data = await response.json();
                cbrMetalsCache = data;
                cbrMetalsTimestamp = Date.now();
            }
        } catch (e) {
            console.error("Failed to update CBR Metals cache", e);
        } finally {
            cbrMetalsUpdatePromise = null;
        }
    })();
    return cbrMetalsUpdatePromise;
}

function _updateFixerRatesCache(): Promise<void> {
    if (isCacheValid(fixerRatesTimestamp, CACHE_TTL_RATES) && Object.keys(fixerRatesCache).length > 0) return Promise.resolve();
    if (fixerUpdatePromise) return fixerUpdatePromise;
    fixerUpdatePromise = (async () => {
        try {
            const data = await fixerApiFetch('latest');
            if (data?.success) {
                fixerRatesCache = data.rates;
                fixerRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error("Failed to update Fixer cache", e);
        } finally {
            fixerUpdatePromise = null;
        }
    })();
    return fixerUpdatePromise;
}

function _updateCoinlayerRatesCache(): Promise<void> {
    if (isCacheValid(coinlayerRatesTimestamp, CACHE_TTL_RATES) && Object.keys(coinlayerRatesCache).length > 0) return Promise.resolve();
    if (coinlayerUpdatePromise) return coinlayerUpdatePromise;
    coinlayerUpdatePromise = (async () => {
        try {
            const data = await coinlayerApiFetch('live');
            if (data?.success) {
                coinlayerRatesCache = data.rates;
                coinlayerRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error("Failed to update Coinlayer cache", e);
        } finally {
            coinlayerUpdatePromise = null;
        }
    })();
    return coinlayerUpdatePromise;
}

function getRateVsUsd(code: string): number | undefined {
    if (code === 'USD') return 1;

    // 1. Check Coinlayer (Crypto)
    if (coinlayerRatesCache[code]) return coinlayerRatesCache[code];

    // 2. Check CBR Metals (fallback for metals)
    const mCode = metalMap[code];
    if (mCode && cbrMetalsCache[mCode]) {
        const rubPerGram = cbrMetalsCache[mCode];
        if (cbrRatesCache?.Valute?.['USD']) {
            const rubPerUsd = cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal;
            return (rubPerGram * 31.1035) / rubPerUsd;
        }
    }

    // 3. Main Sources
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        const val = (nbrbRatesCache[code].rate / nbrbRatesCache[code].scale) / (nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale);
        if (metalCodes.includes(code)) return val * 31.1035;
        return val;
    }
    if (cbrRatesCache?.Valute?.[code] && cbrRatesCache?.Valute?.['USD']) {
        const val = (cbrRatesCache.Valute[code].Value / cbrRatesCache.Valute[code].Nominal) / (cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal);
        if (metalCodes.includes(code)) return val * 31.1035;
        return val;
    }
    if (currencyApiRatesCache[code]) return 1 / currencyApiRatesCache[code];
    if (fixerRatesCache[code] && fixerRatesCache['USD']) return fixerRatesCache['USD'] / fixerRatesCache[code];

    return undefined;
}

export function findRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    const fromUsd = getRateVsUsd(from);
    const toUsd = getRateVsUsd(to);
    if (fromUsd !== undefined && toUsd !== undefined && toUsd !== 0) {
        return fromUsd / toUsd;
    }
    return undefined;
}

export async function getCurrencies(): Promise<Currency[]> {
    const list = [...currencyApiPreloadedCurrencies];
    cryptoCodes.forEach(code => {
        if (!list.find(c => c.code === code)) {
            list.push({ code, name: code });
        }
    });
    return list.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[]): Promise<ExchangeRate[]> {
    await preFetchInitialRates();
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to, rate: findRate(from, to) };
    });
}

export async function findRateAsync(from: string, to: string): Promise<number | undefined> {
    await preFetchInitialRates();
    let rate = findRate(from, to);
    if (rate === undefined && (cryptoCodes.includes(from) || cryptoCodes.includes(to))) {
         await Promise.all([_updateCoinlayerRatesCache(), _updateCbrMetalsCache(), _updateCbrRatesCache()]);
         rate = findRate(from, to);
    }
    return rate;
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    if (date > new Date()) return undefined;

    const getValVsUsd = async (code: string, dateObj: Date): Promise<number | undefined> => {
        if (code === 'USD') return 1;
        const cacheKey = `${code}_${format(dateObj, 'yyyyMMdd')}`;
        if (historicalCache.has(cacheKey)) return historicalCache.get(cacheKey);

        const fDate = format(dateObj, 'yyyy-MM-dd');
        const cbrDate = format(dateObj, 'dd/MM/yyyy');
        const nbrbDate = format(dateObj, 'yyyy-MM-dd');

        // A. Crypto
        if (actualCrypto.includes(code)) {
            const data = await coinlayerApiFetch(fDate, { symbols: code });
            if (data?.success && data.rates[code]) {
                const val = data.rates[code];
                historicalCache.set(cacheKey, val);
                return val;
            }
        }

        // B. Metals
        if (metalCodes.includes(code)) {
            const mCode = metalMap[code];
            const d1 = format(subDays(dateObj, 4), 'dd.MM.yyyy');
            const d2 = format(dateObj, 'dd.MM.yyyy');
            const [mRes, uRes] = await Promise.all([
                fetch(`/api/cbr/metals?date_req1=${d1}&date_req2=${d2}`).then(r => r.json()).catch(() => null),
                fetch(`/api/cbr/history?date_req=${cbrDate}`).then(r => r.json()).catch(() => null)
            ]);
            let rubG: string | undefined;
            if (mRes?.Metall?.Record) {
                const records = Array.isArray(mRes.Metall.Record) ? mRes.Metall.Record : [mRes.Metall.Record];
                const sorted = records.filter((r: any) => r.$.Code === mCode).sort((a: any, b: any) => b.$.Date.split('.').reverse().join('').localeCompare(a.$.Date.split('.').reverse().join('')));
                rubG = sorted[0]?.Buy?.[0]?.replace(',', '.');
            }
            const valutes = uRes?.ValCurs?.Valute;
            const uVal = Array.isArray(valutes) ? valutes.find((v: any) => v.CharCode[0] === 'USD') : undefined;
            if (rubG && uVal) {
                const rubU = parseFloat(uVal.Value[0].replace(',', '.')) / parseInt(uVal.Nominal[0], 10);
                const val = (parseFloat(rubG) * 31.1035) / rubU;
                historicalCache.set(cacheKey, val);
                return val;
            }
        }

        // C. Fiat - Try sources
        const nbrbVal = await nbrbApiFetch(`rates/${code}?onDate=${nbrbDate}&parammode=2`).catch(() => null);
        const nbrbUsd = await nbrbApiFetch(`rates/USD?onDate=${nbrbDate}&parammode=2`).catch(() => null);
        if (nbrbVal && nbrbUsd) {
            const val = (nbrbVal.Cur_OfficialRate / nbrbVal.Cur_Scale) / (nbrbUsd.Cur_OfficialRate / nbrbUsd.Cur_Scale);
            historicalCache.set(cacheKey, val);
            return val;
        }

        const cbrRes = await fetch(`/api/cbr/history?date_req=${cbrDate}`).then(r => r.json()).catch(() => null);
        const valutes = cbrRes?.ValCurs?.Valute;
        if (Array.isArray(valutes)) {
            const v = valutes.find((i: any) => i.CharCode[0] === code);
            const u = valutes.find((i: any) => i.CharCode[0] === 'USD');
            if (v && u) {
                const rV = parseFloat(v.Value[0].replace(',', '.')) / parseInt(v.Nominal[0], 10);
                const rU = parseFloat(u.Value[0].replace(',', '.')) / parseInt(u.Nominal[0], 10);
                const val = rV / rU;
                historicalCache.set(cacheKey, val);
                return val;
            }
        }

        return undefined;
    };

    const [fVal, tVal] = await Promise.all([getValVsUsd(from, date), getValVsUsd(to, date)]);
    return (fVal !== undefined && tVal !== undefined && tVal !== 0) ? fVal / tVal : undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const daysCount = Math.min(differenceInDays(endDate, startDate) + 1, 31);
    const results: { date: string; rate: number }[] = [];
    
    // Use sequential fetching to avoid API rate limits
    for (let i = 0; i < daysCount; i++) {
        const d = addDays(startDate, i);
        const r = await getHistoricalRate(from, to, d);
        if (r !== undefined) {
            results.push({ date: format(d, 'dd.MM'), rate: r });
        }
    }
    return results;
}

export async function preFetchInitialRates() {
    const ds = getDataSource();
    const tasks = [
        _updateCoinlayerRatesCache().catch(() => {}),
        _updateCbrMetalsCache().catch(() => {}),
        _updateCbrRatesCache().catch(() => {}),
        _updateFixerRatesCache().catch(() => {})
    ];
    
    if (ds === 'nbrb') tasks.push(_updateNbrbRatesCache().catch(() => {}));
    else if (ds === 'currencyapi') tasks.push(_updateCurrencyApiRatesCache().catch(() => {}));
    
    await Promise.allSettled(tasks);
}
