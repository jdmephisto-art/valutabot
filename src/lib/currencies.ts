import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, startOfDay, parseISO } from 'date-fns';

let activeDataSource: DataSource = 'nbrb';

// --- Constants ---
// Мы включаем металлы в список "крипто-активов", чтобы они отображались в соответствующем разделе UI
export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BTG', 'DASH', 'EOS', 'XAU', 'XAG', 'XPT', 'XPD'];
const CACHE_TTL_RATES = 15 * 60 * 1000; // 15 minutes
const CACHE_TTL_CURRENCIES = 24 * 60 * 60 * 1000; // 24 hours

// --- Caches & Timestamps ---
let nbrbCurrenciesCache: Currency[] | null = null;
let nbrbCurrenciesTimestamp = 0;
let nbrbFullCurrencyInfoCache: any[] | null = null;
let nbrbFullCurrencyInfoTimestamp = 0;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};
let nbrbRatesTimestamp = 0;

let currencyApiCurrenciesCache: Currency[] | null = null;
let currencyApiCurrenciesTimestamp = 0;
let currencyApiRatesCache: { [key: string]: number } = {};
let currencyApiRatesTimestamp = 0;

let cbrRatesCache: any | null = null;
let cbrRatesTimestamp = 0;
let cbrMetalsCache: { [key: string]: number } = {};
let cbrMetalsTimestamp = 0;

let fixerRatesCache: { [key: string]: number } = {};
let fixerRatesTimestamp = 0;

let coinlayerRatesCache: { [key: string]: number } = {};
let coinlayerRatesTimestamp = 0;

// --- Promise Gates ---
let nbrbUpdatePromise: Promise<void> | null = null;
let currencyApiUpdatePromise: Promise<void> | null = null;
let cbrUpdatePromise: Promise<void> | null = null;
let cbrMetalsUpdatePromise: Promise<void> | null = null;
let fixerUpdatePromise: Promise<void> | null = null;
let coinlayerUpdatePromise: Promise<void> | null = null;

// --- Cache Helper ---
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

async function cbrApiFetch() {
    try {
        const response = await fetch(`/api/cbr`);
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function cbrMetalsApiFetch() {
    try {
        const response = await fetch(`/api/cbr/metals`);
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function cbrHistoryApiFetch(date: Date) {
    const formattedDate = format(date, 'dd/MM/yyyy');
    try {
        const response = await fetch(`/api/cbr/history?date_req=${formattedDate}`);
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

async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

// --- CBR PROVIDERS ---
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

function _updateCbrMetalsCache(): Promise<void> {
    if (isCacheValid(cbrMetalsTimestamp, CACHE_TTL_RATES)) return Promise.resolve();
    if (cbrMetalsUpdatePromise) return cbrMetalsUpdatePromise;
    cbrMetalsUpdatePromise = (async () => {
        try {
            const data = await cbrMetalsApiFetch();
            if (data) {
                cbrMetalsCache = data;
                cbrMetalsTimestamp = Date.now();
            }
        } finally {
            cbrMetalsUpdatePromise = null;
        }
    })();
    return cbrMetalsUpdatePromise;
}

// --- CURRENCYAPI PROVIDER ---
async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    if (isCacheValid(currencyApiCurrenciesTimestamp, CACHE_TTL_CURRENCIES) && currencyApiCurrenciesCache) {
        return currencyApiCurrenciesCache;
    }
    const data = await currencyApiNetFetch('currencies');
    if (data?.currencies) {
        let result: Currency[] = Object.entries(data.currencies).map(([code, name]: [string, any]) => ({
            code,
            name: name as string
        }));
        // Добавляем отсутствующие активы вручную
        const extra = { 'XAU': 'Gold', 'XAG': 'Silver', 'XPT': 'Platinum', 'XPD': 'Palladium', 'ETH': 'Ethereum', 'BTC': 'Bitcoin' };
        Object.entries(extra).forEach(([code, name]) => {
            if (!result.find(c => c.code === code)) result.push({ code, name });
        });
        result.sort((a, b) => a.code.localeCompare(b.code));
        currencyApiCurrenciesCache = result;
        currencyApiCurrenciesTimestamp = Date.now();
        return result;
    }
    return [{ code: 'USD', name: 'US Dollar' }];
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

// --- NBRB PROVIDER ---
async function getNbrbCurrencies(): Promise<Currency[]> {
    if (isCacheValid(nbrbCurrenciesTimestamp, CACHE_TTL_CURRENCIES) && nbrbCurrenciesCache) return nbrbCurrenciesCache;
    const data = await nbrbApiFetch('currencies');
    if (data) {
        nbrbCurrenciesCache = data.filter((c: any) => new Date(c.Cur_DateEnd) > new Date()).map((c: any) => ({
            code: c.Cur_Abbreviation,
            name: c.Cur_Name
        }));
        nbrbCurrenciesTimestamp = Date.now();
        return nbrbCurrenciesCache!;
    }
    return [];
}

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

// --- FIXER & COINLAYER ---
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

// --- UNIVERSAL RATE CALCULATOR ---
function getRateVsUsd(code: string): number | undefined {
    if (code === 'USD') return 1;

    // 1. Металлы от ЦБ РФ (в приоритете для точности в РФ)
    const metalsMap: Record<string, string> = { 'XAU': '1', 'XAG': '2', 'XPT': '3', 'XPD': '4' };
    if (metalsMap[code] && cbrMetalsCache[metalsMap[code]]) {
        const rubPerGram = cbrMetalsCache[metalsMap[code]];
        const usdRub = cbrRatesCache?.Valute?.['USD']?.Value;
        if (usdRub) {
            // ЦБ дает RUB/грамм. Мировой стандарт: USD/унция. 1 унция = 31.1035 грамм.
            return (rubPerGram * 31.1035) / usdRub;
        }
    }

    // 2. Криптовалюты (Coinlayer)
    if (coinlayerRatesCache[code]) return coinlayerRatesCache[code];

    // 3. Фиат (НБРБ, ЦБ РФ, CurrencyAPI)
    const ds = getDataSource();
    if (ds === 'nbrb' && nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        const rate = nbrbRatesCache[code].rate / nbrbRatesCache[code].scale;
        const usd = nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale;
        return rate / usd;
    }
    if (ds === 'cbr' && cbrRatesCache?.Valute?.[code] && cbrRatesCache?.Valute?.['USD']) {
        const rate = cbrRatesCache.Valute[code].Value / cbrRatesCache.Valute[code].Nominal;
        const usd = cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal;
        return rate / usd;
    }

    // 4. Фолбэк на CurrencyAPI (USD/CODE -> пересчитываем в CODE/USD)
    if (currencyApiRatesCache[code] && currencyApiRatesCache[code] !== 0) {
        return 1 / currencyApiRatesCache[code];
    }

    // 5. Фолбэк на Fixer (EUR/CODE и EUR/USD)
    if (fixerRatesCache[code] && fixerRatesCache['USD']) {
        return fixerRatesCache['USD'] / fixerRatesCache[code];
    }

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
    const [apiCurrencies, nbrbCurrencies] = await Promise.all([
        getCurrencyApiCurrencies(),
        getNbrbCurrencies()
    ]);
    const combined = [...apiCurrencies, ...nbrbCurrencies];
    const unique = Array.from(new Map(combined.map(c => [c.code, c])).values());
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
    if (ds === 'cbr') {
        const data = await cbrHistoryApiFetch(date);
        if (!data?.ValCurs?.Valute) return undefined;
        const val = data.ValCurs.Valute;
        const findVal = (c: string) => {
            if (c === 'RUB') return 1;
            const item = val.find((v: any) => v.CharCode[0] === c);
            return item ? parseFloat(item.Value[0].replace(',', '.')) / parseInt(item.Nominal[0]) : undefined;
        };
        const f = findVal(from);
        const t = findVal(to);
        return (f && t) ? f / t : undefined;
    }
    // Для других источников или крипты используем CurrencyAPI History (требует платный ключ, но это лучший фолбэк)
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
    const promises = Array.from({ length: days }).map((_, i) => getHistoricalRate(from, to, addDays(startDate, i)));
    const results = await Promise.all(promises);
    return results.map((r, i) => r !== undefined ? { date: format(addDays(startDate, i), 'dd.MM'), rate: r } : null).filter((i): i is any => i !== null);
}

export function preFetchInitialRates() {
    return Promise.all([
        _updateCurrencyApiRatesCache(),
        _updateNbrbRatesCache(),
        _updateCbrRatesCache(),
        _updateCbrMetalsCache(),
        _updateFixerRatesCache(),
        _updateCoinlayerRatesCache()
    ]);
}
