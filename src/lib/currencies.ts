import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';

let activeDataSource: DataSource = 'nbrb';

// --- Constants ---
export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BTG', 'DASH', 'EOS', 'XAU', 'XAG', 'XPT', 'XPD'];
const CACHE_TTL_RATES = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_CURRENCIES = 24 * 60 * 60 * 1000; // 24 hours

// --- Caches ---
let nbrbCurrenciesCache: Currency[] | null = null;
let nbrbCurrenciesTimestamp = 0;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};
let nbrbRatesTimestamp = 0;

let currencyApiCurrenciesCache: Currency[] | null = null;
let currencyApiCurrenciesTimestamp = 0;
let currencyApiRatesCache: { [key: string]: number } = {};
let currencyApiRatesTimestamp = 0;

let cbrRatesCache: any | null = null;
let cbrRatesTimestamp = 0;

let fixerRatesCache: { [key: string]: number } = {};
let fixerRatesTimestamp = 0;

let coinlayerRatesCache: { [key: string]: number } = {};
let coinlayerRatesTimestamp = 0;

// --- Promise Gates ---
let nbrbUpdatePromise: Promise<void> | null = null;
let currencyApiUpdatePromise: Promise<void> | null = null;
let cbrUpdatePromise: Promise<void> | null = null;
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

// --- API FETCH HELPERS ---
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

// --- UPDATERS ---
function _updateNbrbRatesCache(): Promise<void> {
    if (isCacheValid(nbrbRatesTimestamp, CACHE_TTL_RATES) && Object.keys(nbrbRatesCache).length > 0) return Promise.resolve();
    if (nbrbUpdatePromise) return nbrbUpdatePromise;
    nbrbUpdatePromise = (async () => {
        try {
            const data = await nbrbApiFetch('rates?periodicity=0');
            if (data) {
                const temp: any = {};
                data.forEach((r: any) => temp[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale });
                nbrbRatesCache = temp;
                nbrbRatesTimestamp = Date.now();
            }
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
        } finally {
            cbrUpdatePromise = null;
        }
    })();
    return cbrUpdatePromise;
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
        } finally {
            coinlayerUpdatePromise = null;
        }
    })();
    return coinlayerUpdatePromise;
}

function getRateVsUsd(code: string): number | undefined {
    if (code === 'USD') return 1;
    if (coinlayerRatesCache[code]) return coinlayerRatesCache[code];

    const ds = getDataSource();
    // Мы всегда проверяем все кэши, чтобы конвертация работала независимо от выбранного источника
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        const rate = nbrbRatesCache[code].rate / nbrbRatesCache[code].scale;
        const usd = nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale;
        return rate / usd;
    }
    if (cbrRatesCache?.Valute?.[code] && cbrRatesCache?.Valute?.['USD']) {
        const rate = cbrRatesCache.Valute[code].Value / cbrRatesCache.Valute[code].Nominal;
        const usd = cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal;
        return rate / usd;
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

// --- EXPORTS ---

export async function getCurrencies(): Promise<Currency[]> {
    const fetchApiCurrencies = async () => {
        if (isCacheValid(currencyApiCurrenciesTimestamp, CACHE_TTL_CURRENCIES) && currencyApiCurrenciesCache) return currencyApiCurrenciesCache;
        const data = await currencyApiNetFetch('currencies');
        if (data?.currencies) {
            const list = Object.entries(data.currencies).map(([code, name]) => ({ code, name: name as string }));
            currencyApiCurrenciesCache = list;
            currencyApiCurrenciesTimestamp = Date.now();
            return list;
        }
        return currencyApiPreloadedCurrencies;
    };

    const fetchNbrbCurrencies = async () => {
        if (isCacheValid(nbrbCurrenciesTimestamp, CACHE_TTL_CURRENCIES) && nbrbCurrenciesCache) return nbrbCurrenciesCache;
        const data = await nbrbApiFetch('currencies');
        if (data) {
            const list = data.filter((c: any) => new Date(c.Cur_DateEnd) > new Date()).map((c: any) => ({
                code: c.Cur_Abbreviation,
                name: c.Cur_Name
            }));
            nbrbCurrenciesCache = list;
            nbrbCurrenciesTimestamp = Date.now();
            return list;
        }
        return [];
    };

    const [apiList, nbrbList] = await Promise.all([fetchApiCurrencies(), fetchNbrbCurrencies()]);
    const combined = [...apiList, ...nbrbList];
    const unique = Array.from(new Map(combined.map(c => [c.code, c])).values());

    // Force add critical codes if missing
    const criticalCodes = ['BTC', 'ETH', 'XAU', 'XAG', 'XPT', 'XPD', 'USD', 'EUR', 'RUB', 'BYN'];
    criticalCodes.forEach(code => {
        if (!unique.find(c => c.code === code)) {
            const preloaded = currencyApiPreloadedCurrencies.find(pc => pc.code === code);
            unique.push({ code, name: preloaded?.name || code });
        }
    });

    return unique.sort((a, b) => a.code.localeCompare(b.code));
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
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    const ds = getDataSource();

    // NBRB History
    if (ds === 'nbrb') {
        const formattedDate = format(date, 'yyyy-M-d');
        // Используем parammode=2, чтобы искать по буквенному коду
        const [fromData, toData] = await Promise.all([
            from === 'BYN' ? { Cur_OfficialRate: 1, Cur_Scale: 1 } : nbrbApiFetch(`rates/${from}?onDate=${formattedDate}&parammode=2`),
            to === 'BYN' ? { Cur_OfficialRate: 1, Cur_Scale: 1 } : nbrbApiFetch(`rates/${to}?onDate=${formattedDate}&parammode=2`)
        ]);
        if (fromData && toData) {
            return (fromData.Cur_OfficialRate / fromData.Cur_Scale) / (toData.Cur_OfficialRate / toData.Cur_Scale);
        }
    }

    // CBR History
    if (ds === 'cbr') {
        const formattedDate = format(date, 'dd/MM/yyyy');
        try {
            const response = await fetch(`/api/cbr/history?date_req=${formattedDate}`);
            if (response.ok) {
                const data = await response.json();
                const valutes = data?.ValCurs?.Valute;
                if (valutes) {
                    const getRate = (code: string) => {
                        if (code === 'RUB') return 1;
                        const v = valutes.find((item: any) => item.CharCode[0] === code);
                        return v ? parseFloat(v.Value[0].replace(',', '.')) / parseInt(v.Nominal[0], 10) : undefined;
                    };
                    const f = getRate(from);
                    const t = getRate(to);
                    if (f !== undefined && t !== undefined) return f / t;
                }
            }
        } catch (e) {
            console.error('CBR History fetch failed', e);
        }
    }

    // Fallback to CurrencyAPI
    const formattedDate = format(date, 'yyyy-MM-dd');
    const data = await currencyApiNetFetch('history', { base: 'USD', date: formattedDate });
    if (data?.rates) {
        const f = from === 'USD' ? 1 : data.rates[from];
        const t = to === 'USD' ? 1 : data.rates[to];
        return (f && t) ? t / f : undefined;
    }

    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const days = differenceInDays(endDate, startDate) + 1;
    // Ограничиваем количество дней, чтобы не перегружать API
    const safeDays = Math.min(days, 60); 
    const promises = Array.from({ length: safeDays }).map((_, i) => getHistoricalRate(from, to, addDays(startDate, i)));
    const results = await Promise.all(promises);
    return results.map((r, i) => r !== undefined ? { date: format(addDays(startDate, i), 'dd.MM'), rate: r } : null).filter((i): i is any => i !== null);
}

/**
 * Оптимизированная загрузка: запускает все обновления, но ожидает только текущий источник.
 */
export async function preFetchInitialRates() {
    const nbrbPromise = _updateNbrbRatesCache();
    const currencyApiPromise = _updateCurrencyApiRatesCache();
    const cbrPromise = _updateCbrRatesCache();
    const fixerPromise = _updateFixerRatesCache();
    const coinlayerPromise = _updateCoinlayerRatesCache();

    // Мы дожидаемся только того источника, который сейчас активен
    const ds = getDataSource();
    if (ds === 'nbrb') await nbrbPromise;
    else if (ds === 'cbr') await cbrPromise;
    else await currencyApiPromise;

    // Крипта всегда важна, поэтому дождемся и её (она обычно быстрая)
    await coinlayerPromise;
}
