

import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, startOfDay, parseISO } from 'date-fns';

let activeDataSource: DataSource = 'ru' === 'ru' ? 'nbrb' : 'currencyapi';

// --- Constants ---
export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BTG', 'DASH', 'EOS'];
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
    const queryParams = new URLSearchParams({
        endpoint,
        ...params
    });

    const url = `/api/currency?${queryParams.toString()}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            if (errorBody?.details?.error?.code === 405 || errorBody?.details?.message?.includes("subscription allowance")) {
                 console.warn(`[DIAGNOSTIC] CurrencyAPI.net request to ${url} failed due to subscription limits.`, JSON.stringify(errorBody));
            } else {
                 console.error(`[DIAGNOSTIC] Internal API request to ${url} FAILED with status ${response.status} ${response.statusText}. Error Body:`, JSON.stringify(errorBody));
            }
            return null;
        }

        const data = await response.json();

        if (data.valid === false || (data.error && data.error.info)) {
             console.warn(`[DIAGNOSTIC] CurrencyAPI.net indicated an error for ${url}. Error:`, data.error.info);
             return null;
        }
        return data;
    } catch (error: any) {
        console.error(`[DIAGNOSTIC] A network or other error occurred while fetching from internal API: ${url}. Error:`, error.message);
        return null;
    }
}

async function cbrApiFetch() {
    try {
        const response = await fetch(`/api/cbr`);
        if (!response.ok) {
            console.error(`CBR request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from CBR API proxy:', error);
        return null;
    }
}

async function cbrHistoryApiFetch(date: Date) {
    const formattedDate = format(date, 'dd/MM/yyyy');
    try {
        const response = await fetch(`/api/cbr/history?date_req=${formattedDate}`);
        if (!response.ok) {
            console.error(`CBR history request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from CBR history API proxy:', error);
        return null;
    }
}

async function fixerApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/fixer?${queryParams.toString()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Fixer API request to ${url} failed: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from Fixer API proxy:', error);
        return null;
    }
}

async function coinlayerApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/coinlayer?${queryParams.toString()}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Coinlayer API request to ${url} failed: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from Coinlayer API proxy:', error);
        return null;
    }
}

async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`, { cache: 'no-store' });
        if (!response.ok) {
            console.error(`NBRB request failed: ${response.status} ${response.statusText}`);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from NBRB API:', error);
        return null;
    }
}


// --- CBR.RU PROVIDER ---
function _updateCbrRatesCache(): Promise<void> {
    if (isCacheValid(cbrRatesTimestamp, CACHE_TTL_RATES) && cbrRatesCache) {
        return Promise.resolve();
    }
    if (cbrUpdatePromise) {
        return cbrUpdatePromise;
    }
    cbrUpdatePromise = (async () => {
        try {
            const data = await cbrApiFetch();
            if (data && data.Valute) {
                cbrRatesCache = data;
                cbrRatesTimestamp = Date.now();
            } else {
                cbrRatesCache = null;
            }
        } finally {
            cbrUpdatePromise = null;
        }
    })();
    return cbrUpdatePromise;
}

function findCbrRate(from: string, to: string): number | undefined {
    if (!cbrRatesCache?.Valute) return undefined;
    if (from === to) return 1;

    const valute = cbrRatesCache.Valute;

    // Rates are FIAT/RUB
    const fromRate = from === 'RUB' ? 1 : (valute[from] ? valute[from].Value / valute[from].Nominal : undefined);
    const toRate = to === 'RUB' ? 1 : (valute[to] ? valute[to].Value / valute[to].Nominal : undefined);

    if (fromRate !== undefined && toRate !== undefined && toRate !== 0) {
        // We want FROM/TO. We have FROM/RUB and TO/RUB.
        // FROM/TO = (FROM/RUB) / (TO/RUB)
        return fromRate / toRate;
    }
    return undefined;
}

async function getCbrHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;

    const data = await cbrHistoryApiFetch(date);

    if (!data?.ValCurs?.Valute) {
        return undefined;
    }

    const valute = data.ValCurs.Valute;

    const findRateToRub = (code: string) => {
        if (code === 'RUB') return 1;
        const currency = valute.find((v: any) => v.CharCode[0] === code);
        if (!currency) return undefined;
        const value = parseFloat(currency.Value[0].replace(',', '.'));
        const nominal = parseInt(currency.Nominal[0], 10);
        return value / nominal;
    };

    const fromRate = findRateToRub(from);
    const toRate = findRateToRub(to);

    if (fromRate !== undefined && toRate !== undefined && toRate !== 0) {
        return fromRate / toRate;
    }
    return undefined;
}

async function getCbrDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        return [];
    }
    if (startDate > endDate) {
        return [];
    }

    const today = startOfDay(new Date());
    let effectiveStartDate = startOfDay(startDate);
    let effectiveEndDate = startOfDay(endDate);
    
    if (effectiveStartDate > today) {
        return [];
    }
    if (effectiveEndDate > today) {
        effectiveEndDate = today;
    }
    
    const promises = [];
    let currentDate = effectiveStartDate;
    while (currentDate <= effectiveEndDate) {
        promises.push(getCbrHistoricalRate(from, to, new Date(currentDate)));
        currentDate = addDays(currentDate, 1);
    }
    
    const settledRates = await Promise.all(promises);

    const validResults = settledRates
        .map((rate, index) => {
            if (rate !== undefined) {
                return {
                    date: format(addDays(effectiveStartDate, index), 'dd.MM'),
                    rate: rate,
                };
            }
            return null;
        })
        .filter((r): r is { date: string, rate: number } => r !== null);
        
    return validResults;
}


// --- CURRENCYAPI.NET PROVIDER ---
async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    if (isCacheValid(currencyApiCurrenciesTimestamp, CACHE_TTL_CURRENCIES) && currencyApiCurrenciesCache) {
        return currencyApiCurrenciesCache;
    }

    const data = await currencyApiNetFetch('currencies');
    
    if (data && data.currencies) {
        let result: Currency[] = Object.entries(data.currencies).map(([code, name]: [string, any]) => ({
            code,
            name: name as string
        }));
        
        if (!result.some(c => c.code === 'BYN')) {
             result.push({ code: 'BYN', name: 'Belarusian Ruble' });
        }
        
        const extraAssets: Record<string, string> = {
            'ETH': 'Ethereum', 'LTC': 'Litecoin', 'XRP': 'Ripple',
            'XAU': 'Gold Ounce', 'XAG': 'Silver Ounce',
            'BCH': 'Bitcoin Cash', 'BTG': 'Bitcoin Gold', 'DASH': 'Dash', 'EOS': 'EOS'
        };

        for (const code in extraAssets) {
            if (!result.some(c => c.code === code)) {
                result.push({ code, name: extraAssets[code] });
            }
        }
        
        result.sort((a, b) => a.code.localeCompare(b.code));
        currencyApiCurrenciesCache = result;
        currencyApiCurrenciesTimestamp = Date.now();
        return result;
    }
    
    return [{ code: 'BYN', name: 'Belarusian Ruble' }];
}

function _updateCurrencyApiRatesCache(baseCurrency = 'USD'): Promise<void> {
    if (isCacheValid(currencyApiRatesTimestamp, CACHE_TTL_RATES) && Object.keys(currencyApiRatesCache).length > 0) {
        return Promise.resolve();
    }

    if (currencyApiUpdatePromise) {
        return currencyApiUpdatePromise;
    }
    
    currencyApiUpdatePromise = (async () => {
        try {
            const data = await currencyApiNetFetch('rates', { base: baseCurrency });
            if (data && data.rates) {
                currencyApiRatesCache = data.rates;
                currencyApiRatesCache[baseCurrency] = 1;
                currencyApiRatesTimestamp = Date.now();
            } else {
                currencyApiRatesCache = {};
            }
        } finally {
            currencyApiUpdatePromise = null;
        }
    })();
    
    return currencyApiUpdatePromise;
}

function findCurrencyApiRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    if (Object.keys(currencyApiRatesCache).length === 0) return undefined;

    // Rates are USD/FIAT
    const fromRate = from === 'USD' ? 1 : currencyApiRatesCache[from];
    const toRate = to === 'USD' ? 1 : currencyApiRatesCache[to];   
    
    if (fromRate && toRate && fromRate !== 0) {
        // We want FROM/TO. We have USD/FROM and USD/TO.
        // FROM/TO = (FROM/USD) / (TO/USD) = (1/fromRate) / (1/toRate) = toRate / fromRate
        return toRate / fromRate;
    }
    return undefined;
}


async function getCurrencyApiHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
     if (!(date instanceof Date) || isNaN(date.getTime())) {
        return undefined;
    }
    const today = startOfDay(new Date());
    if (startOfDay(date) > today) {
        return undefined;
    }
    if (from === to) return 1;

    const formattedDate = format(date, 'yyyy-MM-dd');
    const currencies = [...new Set([from, to])].filter(c => c && c !== 'USD').join(',');

    const params: Record<string, string> = {
        base: 'USD',
        date: formattedDate,
    };
    if (currencies) {
        params.currencies = currencies;
    }

    const data = await currencyApiNetFetch('history', params);

    if (!data || !data.rates) {
        return undefined;
    }
    
    const dailyRates = data.rates; // Rates are USD/FIAT
    const fromRate = from === 'USD' ? 1 : dailyRates[from];
    const toRate = to === 'USD' ? 1 : dailyRates[to];

    if (fromRate !== undefined && toRate !== undefined && fromRate !== 0) {
        // We want FROM/TO = toRate / fromRate
        return toRate / fromRate;
    }

    return undefined;
}

async function getCurrencyApiDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    if (!(startDate instanceof Date) || isNaN(startDate.getTime()) || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
        return [];
    }
     if (startDate > endDate) {
        return [];
    }

    const today = startOfDay(new Date());
    let effectiveStartDate = startOfDay(startDate);
    let effectiveEndDate = startOfDay(endDate);
    
    if (effectiveStartDate > today) {
        return [];
    }
    if (effectiveEndDate > today) {
        effectiveEndDate = today;
    }

    const promises = [];
    let currentDate = effectiveStartDate;
    while (currentDate <= effectiveEndDate) {
        promises.push(getCurrencyApiHistoricalRate(from, to, new Date(currentDate)));
        currentDate = addDays(currentDate, 1);
    }
    
    const settledRates = await Promise.all(promises);

    const validResults = settledRates
        .map((rate, index) => {
            if (rate !== undefined) {
                return {
                    date: format(addDays(effectiveStartDate, index), 'dd.MM'),
                    rate: rate,
                };
            }
            return null;
        })
        .filter((r): r is { date: string, rate: number } => r !== null);
        
    return validResults;
}

// --- FIXER.IO PROVIDER ---
function _updateFixerRatesCache(): Promise<void> {
    if (isCacheValid(fixerRatesTimestamp, CACHE_TTL_RATES) && Object.keys(fixerRatesCache).length > 0) {
        return Promise.resolve();
    }
    if (fixerUpdatePromise) {
        return fixerUpdatePromise;
    }
    fixerUpdatePromise = (async () => {
        try {
            const data = await fixerApiFetch('latest');
            if (data && data.success && data.rates) {
                fixerRatesCache = data.rates;
                fixerRatesTimestamp = Date.now();
            } else {
                fixerRatesCache = {};
            }
        } finally {
            fixerUpdatePromise = null;
        }
    })();
    return fixerUpdatePromise;
}

function findFixerRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    if (Object.keys(fixerRatesCache).length === 0) return undefined;
    
    // Rates are EUR/FIAT
    const fromRateEur = from === 'EUR' ? 1 : fixerRatesCache[from];
    const toRateEur = to === 'EUR' ? 1 : fixerRatesCache[to];
    
    if (fromRateEur && toRateEur && fromRateEur !== 0) {
        // We want FROM/TO. We have EUR/FROM and EUR/TO
        // FROM/TO = (FROM/EUR) / (TO/EUR) = (1/fromRateEur) / (1/toRateEur) = toRateEur / fromRateEur
        return toRateEur / fromRateEur;
    }
    return undefined;
}

// --- COINLAYER PROVIDER ---
function _updateCoinlayerRatesCache(): Promise<void> {
    if (isCacheValid(coinlayerRatesTimestamp, CACHE_TTL_RATES) && Object.keys(coinlayerRatesCache).length > 0) {
        return Promise.resolve();
    }
    if (coinlayerUpdatePromise) {
        return coinlayerUpdatePromise;
    }
    coinlayerUpdatePromise = (async () => {
        try {
            const data = await coinlayerApiFetch('live');
            if (data && data.success && data.rates) {
                coinlayerRatesCache = data.rates;
                coinlayerRatesTimestamp = Date.now();
            } else {
                coinlayerRatesCache = {};
            }
        } finally {
            coinlayerUpdatePromise = null;
        }
    })();
    return coinlayerUpdatePromise;
}

// --- NBRB PROVIDER ---
async function ensureNbrbFullCache() {
    if (isCacheValid(nbrbFullCurrencyInfoTimestamp, CACHE_TTL_CURRENCIES) && nbrbFullCurrencyInfoCache) {
        return;
    }
    const data = await nbrbApiFetch('currencies');
    if (data) {
        nbrbFullCurrencyInfoCache = data.filter((c: any) => new Date(c.Cur_DateEnd) > new Date());
        nbrbFullCurrencyInfoTimestamp = Date.now();
    } else {
        nbrbFullCurrencyInfoCache = [];
    }
}

function buildNbrbIdMap() {
    if (!nbrbFullCurrencyInfoCache) return {};
    return nbrbFullCurrencyInfoCache.reduce((acc, cur) => {
        acc[cur.Cur_Abbreviation] = cur.Cur_ID;
        return acc;
    }, {} as {[key: string]: number});
}


async function getNbrbCurrencies(): Promise<Currency[]> {
     if (isCacheValid(nbrbCurrenciesTimestamp, CACHE_TTL_CURRENCIES) && nbrbCurrenciesCache) {
        return nbrbCurrenciesCache;
    }
    
    await ensureNbrbFullCache();
    
    let currencies: Currency[] = [];
    if (nbrbFullCurrencyInfoCache) {
        currencies = nbrbFullCurrencyInfoCache.map((c: any) => ({
            code: c.Cur_Abbreviation,
            name: c.Cur_Name,
        }));
    }

    if (!currencies.some(c => c.code === 'BYN')) {
        currencies.push({ code: 'BYN', name: 'Белорусский рубль' });
    }
    
    if (!currencies.some(c => c.code === 'RUB')) {
        currencies.push({ code: 'RUB', name: 'Российский рубль' });
    }

    currencies.sort((a, b) => a.code.localeCompare(b.code));
    
    nbrbCurrenciesCache = currencies;
    nbrbCurrenciesTimestamp = Date.now();
    return nbrbCurrenciesCache;
}

function _updateNbrbRatesCache(): Promise<void> {
    if (isCacheValid(nbrbRatesTimestamp, CACHE_TTL_RATES) && Object.keys(nbrbRatesCache).length > 0) {
        return Promise.resolve();
    }

    if (nbrbUpdatePromise) {
        return nbrbUpdatePromise;
    }

    nbrbUpdatePromise = (async () => {
        try {
            const dailyData = await nbrbApiFetch('rates?periodicity=0');
            const monthlyData = await nbrbApiFetch('rates?periodicity=1');

            const tempCache: { [key: string]: { rate: number, scale: number } } = {};
            
            if (dailyData) {
                dailyData.forEach((r: any) => {
                    tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
                });
            }
            if (monthlyData) {
                monthlyData.forEach((r: any) => {
                    if (!tempCache[r.Cur_Abbreviation]) {
                        tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
                    }
                });
            }
            if (Object.keys(tempCache).length > 0) {
                nbrbRatesCache = tempCache;
                nbrbRatesTimestamp = Date.now();
            }
        } finally {
            nbrbUpdatePromise = null;
        }
    })();
    
    return nbrbUpdatePromise;
}

function findNbrbRate(from: string, to: string): number | undefined {
    if (Object.keys(nbrbRatesCache).length === 0) return undefined;
    if (from === to) return 1;

    // Rates are FIAT/BYN
    const fromRate = from === 'BYN' ? 1 : (nbrbRatesCache[from] ? nbrbRatesCache[from].rate / nbrbRatesCache[from].scale : undefined);
    const toRate = to === 'BYN' ? 1 : (nbrbRatesCache[to] ? nbrbRatesCache[to].rate / nbrbRatesCache[to].scale : undefined);

    if (fromRate !== undefined && toRate !== undefined && toRate !== 0) {
        // We want FROM/TO. We have FROM/BYN and TO/BYN
        // FROM/TO = (FROM/BYN) / (TO/BYN)
        return fromRate / toRate;
    }
    return undefined;
}

async function getNbrbHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    
    await ensureNbrbFullCache();
    const nbrbIdMap = buildNbrbIdMap();
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    const getRateForCode = async (code: string) => {
        if (code === 'BYN') return { rate: 1, scale: 1 };
        const id = nbrbIdMap?.[code];
        if (!id) return undefined;
        const data = await nbrbApiFetch(`rates/${id}?ondate=${formattedDate}`);
        return data ? { rate: data.Cur_OfficialRate, scale: data.Cur_Scale } : undefined;
    };

    const [fromRateInfo, toRateInfo] = await Promise.all([getRateForCode(from), getRateForCode(to)]);
    
    const rateToBynForFROM = fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined;
    const rateToBynForTO = toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined;
    
    if (rateToBynForFROM !== undefined && rateToBynForTO !== undefined && rateToBynForTO !== 0) {
        return rateToBynForFROM / rateToBynForTO;
    }
    return undefined;
}

async function getNbrbDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    await ensureNbrbFullCache();
    if (!nbrbFullCurrencyInfoCache) return [];

    const nbrbIdMap = buildNbrbIdMap();

    const fromInfo = nbrbFullCurrencyInfoCache.find(c => c.Cur_Abbreviation === from);
    const toInfo = nbrbFullCurrencyInfoCache.find(c => c.Cur_Abbreviation === to);

    const fromScale = from === 'BYN' ? 1 : (fromInfo?.Cur_Scale ?? 1);
    const toScale = to === 'BYN' ? 1 : (toInfo?.Cur_Scale ?? 1);
    
    const formattedStart = format(startDate, 'yyyy-MM-dd');
    const formattedEnd = format(endDate, 'yyyy-MM-dd');

    const getDynamicsForCode = async (code: string) => {
        if (code === 'BYN') {
            const days = differenceInDays(endDate, startDate) + 1;
            return Array.from({ length: days }).map((_, i) => ({ date: addDays(startDate, i), rate: 1 }));
        }
        const id = nbrbIdMap?.[code];
        if (!id) return [];
        const data = await nbrbApiFetch(`rates/dynamics/${id}?startdate=${formattedStart}&enddate=${formattedEnd}`);
        if (!data) return [];
        return data.map((r: any) => ({ date: parseISO(r.Date), rate: r.Cur_OfficialRate }));
    };

    const [fromDynamics, toDynamics] = await Promise.all([getDynamicsForCode(from), getDynamicsForCode(to)]);
    
    if (fromDynamics.length === 0 || toDynamics.length === 0) return [];

    const toMap = new Map(toDynamics.map(d => [format(startOfDay(d.date), 'yyyy-MM-dd'), d.rate]));
    
    const result = fromDynamics.map(fromDay => {
        const toDayRate = toMap.get(format(startOfDay(fromDay.date), 'yyyy-MM-dd'));

        if (toDayRate !== undefined) {
            const rateToBynForFROM = fromDay.rate / fromScale;
            const rateToBynForTO = toDayRate / toScale;
            if (rateToBynForTO === 0) return null;
            return {
                date: format(fromDay.date, 'dd.MM'),
                rate: rateToBynForFROM / rateToBynForTO,
            };
        }
        return null;
    }).filter((d): d is { date: string, rate: number } => d !== null);

    return result;
}


// --- UNIFIED API ---
export async function getCurrencies(): Promise<Currency[]> {
    if (activeDataSource === 'nbrb' || activeDataSource === 'cbr') {
        const [fiatCurrencies, allApiCurrencies] = await Promise.all([
            activeDataSource === 'nbrb' ? getNbrbCurrencies() : getCurrencyApiCurrencies(), // CBR doesn't have a currency list, so use a comprehensive one.
            getCurrencyApiCurrencies()
        ]);
        const cryptoFromApi = allApiCurrencies.filter(c => cryptoCodes.includes(c.code));
        const combined = [...fiatCurrencies, ...cryptoFromApi];
        const unique = Array.from(new Map(combined.map(item => [item.code, item])).values());
        unique.sort((a, b) => a.code.localeCompare(b.code));
        return unique;
    } else { // currencyapi
        return getCurrencyApiCurrencies();
    }
}

export async function getLatestRates(pairs: string[]): Promise<(Omit<ExchangeRate, 'rate'> & { rate?: number })[]> {
    if (!pairs || pairs.length === 0) {
        return [];
    }
    
    await preFetchInitialRates();
    
    const rates = pairs.map(pairString => {
        const [from, to] = pairString.split('/');
        const rate = findRate(from, to);
        return { from, to, rate };
    });

    return rates;
}

/**
 * Gets the rate of a currency against USD.
 * This is a helper function to create a common bridge for all conversions.
 * @param code The currency code.
 * @returns The rate of the currency against USD (CODE/USD), or undefined if not found.
 */
function getRateVsUsd(code: string): number | undefined {
    if (code === 'USD') return 1;

    const isCrypto = cryptoCodes.includes(code);

    if (isCrypto) {
        // For crypto, try coinlayer first (rates are COIN/USD), then currencyapi (rates are USD/COIN -> 1/rate)
        if (coinlayerRatesCache[code]) {
            return coinlayerRatesCache[code];
        }
        if (currencyApiRatesCache[code] && currencyApiRatesCache[code] !== 0) {
            return 1 / currencyApiRatesCache[code];
        }
        return undefined;
    }

    // --- For FIAT currencies & Metals ---
    const selectedSource = getDataSource();
    
    // 1. Try the user's selected source first for directness
    if (selectedSource === 'currencyapi' && currencyApiRatesCache[code]) {
        return 1 / currencyApiRatesCache[code]; // Rate is USD/CODE
    }
    if (selectedSource === 'nbrb' && nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        const nbrbRate = nbrbRatesCache[code].rate / nbrbRatesCache[code].scale; // FIAT/BYN
        const nbrbUsdRate = nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale; // USD/BYN
        if (nbrbUsdRate === 0) return undefined;
        return nbrbRate / nbrbUsdRate; // (FIAT/BYN) / (USD/BYN) = FIAT/USD
    }
    if (selectedSource === 'cbr' && cbrRatesCache?.Valute?.[code] && cbrRatesCache?.Valute?.['USD']) {
        const valute = cbrRatesCache.Valute;
        const cbrRate = valute[code].Value / valute[code].Nominal; // FIAT/RUB
        const cbrUsdRate = valute['USD'].Value / valute['USD'].Nominal; // USD/RUB
        if (cbrUsdRate === 0) return undefined;
        return cbrRate / cbrUsdRate; // (FIAT/RUB) / (USD/RUB) = FIAT/USD
    }

    // 2. Try fallbacks if selected source fails
    if (currencyApiRatesCache[code] && currencyApiRatesCache[code] !== 0) {
        return 1 / currencyApiRatesCache[code];
    }

    const fixerRate = fixerRatesCache[code]; // EUR/CODE
    const fixerEurUsdRate = fixerRatesCache['USD']; // EUR/USD
    if (fixerRate && fixerEurUsdRate && fixerRate !== 0) {
        // We want CODE/USD. We have EUR/CODE and EUR/USD.
        // CODE/USD = (CODE/EUR) / (USD/EUR) = (1/fixerRate) / (1/fixerEurUsdRate) = fixerEurUsdRate / fixerRate
        return fixerEurUsdRate / fixerRate;
    }
    
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        const nbrbRate = nbrbRatesCache[code].rate / nbrbRatesCache[code].scale; // FIAT/BYN
        const nbrbUsdRate = nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale; // USD/BYN
        if (nbrbUsdRate === 0) return undefined;
        return nbrbRate / nbrbUsdRate; // (FIAT/BYN) / (USD/BYN) = FIAT/USD
    }

    const valute = cbrRatesCache?.Valute;
    if (valute?.[code] && valute?.['USD']) {
        const cbrRate = valute[code].Value / valute[code].Nominal; // FIAT/RUB
        const cbrUsdRate = valute['USD'].Value / valute['USD'].Nominal; // USD/RUB
        if (cbrUsdRate === 0) return undefined;
        return cbrRate / cbrUsdRate; // (FIAT/RUB) / (USD/RUB) = FIAT/USD
    }
    
    return undefined;
}


export function findRate(from: string, to: string): number | undefined {
    if (from === to) return 1;

    // Use priority sources for BYN and RUB first, as they are most accurate for the region
    if (from === 'BYN' || to === 'BYN') {
        const nbrbRate = findNbrbRate(from, to);
        if (nbrbRate !== undefined) return nbrbRate;
    }
    if (from === 'RUB' || to === 'RUB') {
        const cbrRate = findCbrRate(from, to);
        if (cbrRate !== undefined) return cbrRate;
    }
    
    // Universal method using USD as a bridge for all other cases (incl. crypto-fiat)
    const fromRateVsUsd = getRateVsUsd(from);
    const toRateVsUsd = getRateVsUsd(to);
    
    if (fromRateVsUsd !== undefined && toRateVsUsd !== undefined && toRateVsUsd !== 0) {
        // We want FROM/TO. We have FROM/USD and TO/USD.
        // FROM/TO = (FROM/USD) / (TO/USD)
        return fromRateVsUsd / toRateVsUsd;
    }

    // Final fallback to direct find functions if USD bridge fails
    const selectedSource = getDataSource();
    if (selectedSource === 'currencyapi') return findCurrencyApiRate(from, to);
    if (selectedSource === 'nbrb') return findNbrbRate(from, to);
    if (selectedSource === 'cbr') return findCbrRate(from, to);

    return undefined;
}

export async function findRateAsync(from: string, to: string): Promise<number | undefined> {
    await preFetchInitialRates();
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    const source = getDataSource();

    if (from === to) return 1;

    if (source === 'cbr') {
        return getCbrHistoricalRate(from, to, date);
    }

    if (source === 'nbrb') {
        return getNbrbHistoricalRate(from, to, date);
    }
    
    // currencyapi (paid feature) is the only one that can handle historical crypto
    if (source === 'currencyapi') {
        return getCurrencyApiHistoricalRate(from, to, date);
    }

    // Fallback for crypto when main source is not currencyapi
    const fromIsCrypto = cryptoCodes.includes(from);
    const toIsCrypto = cryptoCodes.includes(to);
    if(fromIsCrypto || toIsCrypto) {
        return getCurrencyApiHistoricalRate(from, to, date);
    }

    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const source = getDataSource();

    if (from === to) {
        const days = differenceInDays(endDate, startDate) + 1;
        return Array.from({ length: days }).map((_, i) => ({
            date: format(addDays(startDate, i), 'dd.MM'),
            rate: 1,
        }));
    }

    if (source === 'cbr') {
        return getCbrDynamicsForPeriod(from, to, startDate, endDate);
    }

    if (source === 'nbrb') {
        return getNbrbDynamicsForPeriod(from, to, startDate, endDate);
    }

    if (source === 'currencyapi') {
        return getCurrencyApiDynamicsForPeriod(from, to, startDate, endDate);
    }

    // Fallback for crypto
    const fromIsCrypto = cryptoCodes.includes(from);
    const toIsCrypto = cryptoCodes.includes(to);
    if(fromIsCrypto || toIsCrypto) {
        return getCurrencyApiDynamicsForPeriod(from, to, startDate, endDate);
    }

    return [];
}

export function preFetchInitialRates() {
    const promises: Promise<void>[] = [];
    promises.push(_updateCurrencyApiRatesCache('USD'));
    promises.push(_updateNbrbRatesCache());
    promises.push(_updateCbrRatesCache());
    promises.push(_updateFixerRatesCache());
    promises.push(_updateCoinlayerRatesCache());
    return Promise.all(promises);
}
