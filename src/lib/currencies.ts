import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, startOfDay, parseISO } from 'date-fns';

let activeDataSource: DataSource = 'ru' === 'ru' ? 'nbrb' : 'currencyapi';

// --- Constants ---
export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'XAU', 'XAG', 'BCH', 'BTG', 'DASH', 'EOS'];
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

// --- Promise Gates ---
let nbrbUpdatePromise: Promise<void> | null = null;
let currencyApiUpdatePromise: Promise<void> | null = null;
let cbrUpdatePromise: Promise<void> | null = null;

// --- Cache Helper ---
function isCacheValid(timestamp: number, ttl: number): boolean {
    return timestamp > 0 && (Date.now() - timestamp) < ttl;
}


export function setDataSource(source: DataSource) {
    if (source !== activeDataSource) {
        activeDataSource = source;
        // Clear all caches and promises to ensure fresh data from the new source
        nbrbCurrenciesCache = null;
        nbrbCurrenciesTimestamp = 0;
        nbrbFullCurrencyInfoCache = null;
        nbrbFullCurrencyInfoTimestamp = 0;
        nbrbRatesCache = {};
        nbrbRatesTimestamp = 0;

        currencyApiCurrenciesCache = null;
        currencyApiCurrenciesTimestamp = 0;
        currencyApiRatesCache = {};
        currencyApiRatesTimestamp = 0;
        
        cbrRatesCache = null;
        cbrRatesTimestamp = 0;
        
        nbrbUpdatePromise = null;
        currencyApiUpdatePromise = null;
        cbrUpdatePromise = null;
    }
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

// --- API FETCH HELPERS ---
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
            // Check for specific subscription error to avoid breaking the app
            if (errorBody?.details?.error?.code === 405) {
                 console.warn(`[DIAGNOSTIC] CurrencyAPI.net request to ${url} failed due to subscription limits.`, JSON.stringify(errorBody));
            } else {
                 console.error(`[DIAGNOSTIC] Internal API request to ${url} FAILED with status ${response.status} ${response.statusText}. Error Body:`, JSON.stringify(errorBody));
            }
            return null;
        }

        const data = await response.json();

        if (data.valid === false || (data.error && data.error.info)) {
             console.error(`[DIAGNOSTIC] CurrencyAPI.net indicated an error for ${url}. Error:`, data.error.info);
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
                // If the API call fails (e.g., rate limit), clear the cache to indicate data is stale
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

    const fromRate = currencyApiRatesCache[from];
    const toRate = currencyApiRatesCache[to];   
    
    if (fromRate && toRate) {
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
    
    const dailyRates = data.rates;
    const fromRate = from === 'USD' ? 1 : dailyRates[from];
    const toRate = to === 'USD' ? 1 : dailyRates[to];

    if (fromRate !== undefined && toRate !== undefined && fromRate !== 0) {
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

    const toRateInfo = nbrbRatesCache[to];
    const fromRateInfo = nbrbRatesCache[from];
    
    const rateToBynForFROM = from === 'BYN' ? 1 : (fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined);
    const rateToBynForTO = to === 'BYN' ? 1 : (toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined);

    if (rateToBynForFROM !== undefined && rateToBynForTO !== undefined && rateToBynForTO !== 0) {
        return rateToBynForFROM / rateToBynForTO;
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
    if (activeDataSource === 'nbrb') {
        const [nbrbFiat, allApiCurrencies] = await Promise.all([
            getNbrbCurrencies(),
            getCurrencyApiCurrencies()
        ]);
        const cryptoFromApi = allApiCurrencies.filter(c => cryptoCodes.includes(c.code));
        const combined = [...nbrbFiat, ...cryptoFromApi];
        const unique = Array.from(new Map(combined.map(item => [item.code, item])).values());
        unique.sort((a, b) => a.code.localeCompare(b.code));
        return unique;
    } else {
        return getCurrencyApiCurrencies();
    }
}

export async function getLatestRates(pairs?: string[]): Promise<(Omit<ExchangeRate, 'rate'> & { rate?: number })[]> {
    if (!pairs || pairs.length === 0) {
        return [];
    }
    
    const updatePromises: Promise<void>[] = [];
    
    // Pre-warm all caches. Their internal TTL will prevent unnecessary fetches.
    updatePromises.push(_updateNbrbRatesCache());
    updatePromises.push(_updateCbrRatesCache());
    updatePromises.push(_updateCurrencyApiRatesCache('USD'));
    
    await Promise.all(updatePromises);
    
    const rates = pairs.map(pairString => {
        const [from, to] = pairString.split('/');
        const rate = findRate(from, to);
        return { from, to, rate }; // rate can be undefined
    });

    return rates;
}

export function findRate(from: string, to: string): number | undefined {
    if (from === to) return 1;

    // A consistent helper to get any currency's rate against USD.
    // It handles crypto, BYN, RUB, data source logic, and fallbacks internally.
    const getRateAgainstUsd = (code: string): number | undefined => {
        if (code === 'USD') return 1;

        // BYN is special, must use NBRB as it's the authority for BYN.
        if (code === 'BYN') {
            return findNbrbRate('BYN', 'USD');
        }

        // RUB is special, must use CBR as it's the authority for RUB.
        if (code === 'RUB') {
            const cbrUsdData = cbrRatesCache?.Valute?.USD;
            if (cbrUsdData?.Value) {
                // CBR gives USD -> RUB rate. We need USD per 1 RUB.
                return 1 / cbrUsdData.Value;
            }
        }
        
        // Crypto is special, must use CurrencyAPI as NBRB doesn't have it.
        if (cryptoCodes.includes(code)) {
            return findCurrencyApiRate(code, 'USD');
        }
        
        // For other fiat, prioritize currencyapi but fallback to nbrb
        const apiRate = findCurrencyApiRate(code, 'USD');
        if (apiRate !== undefined) {
            return apiRate;
        }

        return findNbrbRate(code, 'USD');
    };

    const fromRate = getRateAgainstUsd(from);
    const toRate = getRateAgainstUsd(to);
    
    if (fromRate !== undefined && toRate !== undefined && fromRate !== 0) {
        // We want to find how many TO is 1 FROM.
        // 1 FROM = fromRate USD
        // 1 TO   = toRate USD
        // So: 1 FROM = (fromRate / toRate) TO
        return fromRate / toRate;
    }

    return undefined;
}


export async function findRateAsync(from: string, to: string): Promise<number | undefined> {
    const updatePromises: Promise<void>[] = [];
    updatePromises.push(_updateNbrbRatesCache());
    updatePromises.push(_updateCbrRatesCache());
    updatePromises.push(_updateCurrencyApiRatesCache('USD'));
    await Promise.all(updatePromises);
    
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (activeDataSource === 'currencyapi') return undefined; // API plan does not support this.

    const fromIsCrypto = cryptoCodes.includes(from);
    const toIsCrypto = cryptoCodes.includes(to);

    if (from === to) return 1;

    if ((fromIsCrypto || toIsCrypto) && from !== 'BYN' && to !== 'BYN') {
        return getCurrencyApiHistoricalRate(from, to, date);
    }

    if (from === 'BYN' || to === 'BYN') {
        const otherCode = from === 'BYN' ? to : from;
        const otherIsCrypto = cryptoCodes.includes(otherCode);

        if (otherIsCrypto) {
            const [usdToBynRate, usdToCryptoRate] = await Promise.all([
                getNbrbHistoricalRate('USD', 'BYN', date),
                getCurrencyApiHistoricalRate('USD', otherCode, date)
            ]);
            
            if (usdToBynRate && usdToCryptoRate) {
                const bynToCryptoRate = usdToCryptoRate / usdToBynRate;
                return from === 'BYN' ? bynToCryptoRate : 1 / bynToCryptoRate;
            }
            return undefined;
        } else {
            return getNbrbHistoricalRate(from, to, date);
        }
    }

    if (activeDataSource === 'nbrb') {
        return getNbrbHistoricalRate(from, to, date);
    } else {
        return getCurrencyApiHistoricalRate(from, to, date);
    }
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    if (activeDataSource === 'currencyapi') return []; // API plan does not support this.
    
    if (from === to) {
        const days = differenceInDays(endDate, startDate) + 1;
        return Array.from({ length: days }).map((_, i) => ({
            date: format(addDays(startDate, i), 'dd.MM'),
            rate: 1,
        }));
    }

    const fromIsCrypto = cryptoCodes.includes(from);
    const toIsCrypto = cryptoCodes.includes(to);

    if ((fromIsCrypto || toIsCrypto) && from !== 'BYN' && to !== 'BYN') {
        return getCurrencyApiDynamicsForPeriod(from, to, startDate, endDate);
    }

    if (from === 'BYN' || to === 'BYN') {
        const otherCode = from === 'BYN' ? to : from;
        const otherIsCrypto = cryptoCodes.includes(otherCode);

        if (otherIsCrypto) {
            const [usdToBynDynamics, usdToCryptoDynamics] = await Promise.all([
                getNbrbDynamicsForPeriod('USD', 'BYN', startDate, endDate),
                getCurrencyApiDynamicsForPeriod('USD', otherCode, startDate, endDate)
            ]);

            const bynMap = new Map(usdToBynDynamics.map(d => [d.date, d.rate]));
            const cryptoMap = new Map(usdToCryptoDynamics.map(d => [d.date, d.rate]));
            
            const result: { date: string; rate: number }[] = [];
            const commonDates = new Set([...bynMap.keys()].filter(k => cryptoMap.has(k)));

            for (const date of commonDates) {
                const bynRate = bynMap.get(date)!;
                const cryptoRate = cryptoMap.get(date)!;
                if (bynRate === 0) continue;
                const bynToCryptoRate = cryptoRate / bynRate;
                result.push({ date, rate: from === 'BYN' ? bynToCryptoRate : 1 / bynToCryptoRate });
            }
            result.sort((a, b) => a.date.localeCompare(b.date, undefined, { numeric: true }));
            return result;

        } else {
            return getNbrbDynamicsForPeriod(from, to, startDate, endDate);
        }
    }
    
    if (activeDataSource === 'nbrb') {
        return getNbrbDynamicsForPeriod(from, to, startDate, endDate);
    } else {
        return getCurrencyApiDynamicsForPeriod(from, to, startDate, endDate);
    }
}

export function preFetchInitialRates() {
    _updateCurrencyApiRatesCache('USD');
    _updateNbrbRatesCache();
    _updateCbrRatesCache();
}
