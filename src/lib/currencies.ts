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

    // Check Coinlayer (Crypto)
    if (coinlayerRatesCache[code]) return coinlayerRatesCache[code];

    // Check CBR Metals (XAU, XAG, XPT, XPD)
    const metalCodeMap: Record<string, string> = { 'XAU': '1', 'XAG': '2', 'XPT': '3', 'XPD': '4' };
    if (metalCodeMap[code] && cbrMetalsCache[metalCodeMap[code]]) {
        const rubPerGram = cbrMetalsCache[metalCodeMap[code]];
        if (cbrRatesCache?.Valute?.['USD']) {
            const rubPerUsd = cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal;
            // 1 Troy Ounce = 31.1035 grams. Result is USD per Ounce.
            return (rubPerGram * 31.1035) / rubPerUsd;
        }
    }

    // Standard Currencies
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
    const list = [...currencyApiPreloadedCurrencies];
    const criticalCodes = ['BTC', 'ETH', 'XAU', 'XAG', 'XPT', 'XPD', 'USD', 'EUR', 'RUB', 'BYN'];
    criticalCodes.forEach(code => {
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
    if (rate === undefined) {
        // Force update for crypto/metals if missing
        if (cryptoCodes.includes(from) || cryptoCodes.includes(to)) {
             await Promise.all([_updateCoinlayerRatesCache(), _updateCbrMetalsCache(), _updateCbrRatesCache()]);
             rate = findRate(from, to);
        }
    }
    return rate;
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // 1. Handle Crypto via Coinlayer
    if (cryptoCodes.filter(c => !['XAU', 'XAG', 'XPT', 'XPD'].includes(c)).includes(from) || 
        cryptoCodes.filter(c => !['XAU', 'XAG', 'XPT', 'XPD'].includes(c)).includes(to)) {
        const getCryptoVsUsd = async (code: string) => {
            if (code === 'USD') return 1;
            const data = await coinlayerApiFetch(format(date, 'yyyy-MM-dd'), { symbols: code });
            return data?.success ? data.rates[code] : undefined;
        };
        const getFiatVsUsd = async (code: string) => {
            if (code === 'USD') return 1;
            // Use CurrencyAPI as secondary source for historical fiat vs USD
            const data = await currencyApiNetFetch('history', { base: 'USD', date: format(date, 'yyyy-MM-dd') });
            return data?.rates ? 1 / data.rates[code] : undefined;
        };
        const f = await (cryptoCodes.includes(from) ? getCryptoVsUsd(from) : getFiatVsUsd(from));
        const t = await (cryptoCodes.includes(to) ? getCryptoVsUsd(to) : getFiatVsUsd(to));
        return (f !== undefined && t !== undefined) ? f / t : undefined;
    }

    // 2. Handle Metals via CBR
    const metalCodeMap: Record<string, string> = { 'XAU': '1', 'XAG': '2', 'XPT': '3', 'XPD': '4' };
    if (metalCodeMap[from] || metalCodeMap[to]) {
        const getMetalVsUsd = async (code: string) => {
            const mCode = metalCodeMap[code];
            if (!mCode) return undefined;
            const d = format(date, 'dd.MM.yyyy');
            const [metalRes, usdRes] = await Promise.all([
                fetch(`/api/cbr/metals?date_req1=${d}&date_req2=${d}`).then(r => r.json()),
                fetch(`/api/cbr/history?date_req=${d}`).then(r => r.json())
            ]);
            const rubPerGram = metalRes?.Metall?.Record?.find((r: any) => r.$.Code === mCode)?.Buy[0].replace(',', '.');
            const rubPerUsd = usdRes?.ValCurs?.Valute?.find((v: any) => v.CharCode[0] === 'USD')?.Value[0].replace(',', '.');
            if (rubPerGram && rubPerUsd) {
                return (parseFloat(rubPerGram) * 31.1035) / parseFloat(rubPerUsd);
            }
            return undefined;
        };
        const getFiatVsUsd = async (code: string) => {
            if (code === 'USD') return 1;
            const d = format(date, 'dd.MM.yyyy');
            const res = await fetch(`/api/cbr/history?date_req=${d}`).then(r => r.json());
            const v = res?.ValCurs?.Valute?.find((v: any) => v.CharCode[0] === code);
            return v ? (parseFloat(v.Value[0].replace(',', '.')) / parseInt(v.Nominal[0], 10)) / (parseFloat(res?.ValCurs?.Valute?.find((u: any) => u.CharCode[0] === 'USD')?.Value[0].replace(',', '.'))) : undefined;
        };
        const f = await (metalCodeMap[from] ? getMetalVsUsd(from) : getFiatVsUsd(from));
        const t = await (metalCodeMap[to] ? getMetalVsUsd(to) : getFiatVsUsd(to));
        return (f !== undefined && t !== undefined) ? f / t : undefined;
    }

    // 3. Normal Fiat History
    const ds = getDataSource();
    if (ds === 'nbrb') {
        const d = format(date, 'yyyy-M-d');
        const [fData, tData] = await Promise.all([
            from === 'BYN' ? { Cur_OfficialRate: 1, Cur_Scale: 1 } : nbrbApiFetch(`rates/${from}?onDate=${d}&parammode=2`),
            to === 'BYN' ? { Cur_OfficialRate: 1, Cur_Scale: 1 } : nbrbApiFetch(`rates/${to}?onDate=${d}&parammode=2`)
        ]);
        if (fData && tData) return (fData.Cur_OfficialRate / fData.Cur_Scale) / (tData.Cur_OfficialRate / tData.Cur_Scale);
    }
    if (ds === 'cbr') {
        const d = format(date, 'dd/MM/yyyy');
        const res = await fetch(`/api/cbr/history?date_req=${d}`).then(r => r.json());
        const valutes = res?.ValCurs?.Valute;
        if (valutes) {
            const getR = (c: string) => {
                if (c === 'RUB') return 1;
                const v = valutes.find((i: any) => i.CharCode[0] === c);
                return v ? parseFloat(v.Value[0].replace(',', '.')) / parseInt(v.Nominal[0], 10) : undefined;
            };
            const f = getR(from), t = getR(to);
            if (f !== undefined && t !== undefined) return f / t;
        }
    }
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const days = Math.min(differenceInDays(endDate, startDate) + 1, 30);
    const promises = Array.from({ length: days }).map((_, i) => getHistoricalRate(from, to, addDays(startDate, i)));
    const results = await Promise.all(promises);
    return results.map((r, i) => r !== undefined ? { date: format(addDays(startDate, i), 'dd.MM'), rate: r } : null).filter((i): i is any => i !== null);
}

export async function preFetchInitialRates() {
    const ds = getDataSource();
    const tasks = [_updateCoinlayerRatesCache(), _updateFixerRatesCache()];
    if (ds === 'nbrb') tasks.push(_updateNbrbRatesCache());
    else if (ds === 'cbr') tasks.push(_updateCbrRatesCache(), _updateCbrMetalsCache());
    else tasks.push(_updateCurrencyApiRatesCache());
    await Promise.all(tasks);
}
