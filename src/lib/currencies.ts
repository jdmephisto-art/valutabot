

import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, startOfDay, parseISO } from 'date-fns';

let activeDataSource: DataSource = 'nbrb'; // Default data source

const defaultPairs = [
    { from: 'USD', to: 'EUR' }, { from: 'EUR', to: 'USD' }, { from: 'USD', to: 'BYN' },
    { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'RUB' }, { from: 'EUR', to: 'RUB' },
];

export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'XAU', 'XAG', 'BCH', 'BTG', 'DASH', 'EOS'];

// Caches
let nbrbCurrenciesCache: Currency[] | null = null;
let nbrbFullCurrencyInfoCache: any[] | null = null;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};

let currencyApiCurrenciesCache: Currency[] | null = null;
let currencyApiRatesCache: { [key: string]: number } = {};
let lastCurrencyApiFetchTimestamp = 0;

// Promise gates to prevent race conditions
let nbrbUpdatePromise: Promise<void> | null = null;
let currencyApiUpdatePromise: Promise<void> | null = null;


export function setDataSource(source: DataSource) {
    if (source !== activeDataSource) {
        activeDataSource = source;
        // Clear all caches and promises to ensure fresh data from the new source
        nbrbCurrenciesCache = null;
        nbrbFullCurrencyInfoCache = null;
        nbrbRatesCache = {};
        currencyApiCurrenciesCache = null;
        currencyApiRatesCache = {};
        lastCurrencyApiFetchTimestamp = 0;
        nbrbUpdatePromise = null;
        currencyApiUpdatePromise = null;
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
    const apiKey = '6431078d4fc8bf5d4097027ee62c2c0dc4e0';
    const baseUrl = 'https://currencyapi.net/api/v1/';

    const queryParams = new URLSearchParams({
        key: apiKey,
        output: 'json',
        ...params
    });

    const url = `${baseUrl}${endpoint}?${queryParams.toString()}`;

    try {
        const response = await fetch(url, { 
            headers: { 'Accept': 'application/json' },
            cache: 'no-store' 
        });
        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            console.error(`CurrencyAPI.net request failed: ${response.status} ${response.statusText}`, errorBody);
            return null;
        }
        const data = await response.json();
        if (data.valid === false || data.error) {
             console.error(`CurrencyAPI.net request returned an error:`, data.error || 'Unknown error');
             return null;
        }
        return data;
    } catch (error) {
        console.error('Failed to fetch from CurrencyAPI.net API:', error);
        return null;
    }
}


// --- CURRENCYAPI.NET PROVIDER ---
async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    if (currencyApiCurrenciesCache) {
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
            'XAU': 'Gold Ounce', 'XAG': 'Silver Ounce'
        };

        for (const code in extraAssets) {
            if (!result.some(c => c.code === code)) {
                result.push({ code, name: extraAssets[code] });
            }
        }
        
        result.sort((a, b) => a.code.localeCompare(b.code));
        currencyApiCurrenciesCache = result;
        return result;
    }
    
    return [{ code: 'BYN', name: 'Belarusian Ruble' }];
}

function _updateCurrencyApiRatesCache(baseCurrency = 'USD'): Promise<void> {
    if (Object.keys(currencyApiRatesCache).length > 0 && (Date.now() - lastCurrencyApiFetchTimestamp < 5 * 60 * 1000)) {
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
                lastCurrencyApiFetchTimestamp = Date.now();
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
    if (from === to) return 1;

    // CurrencyAPI free plan doesn't support BYN, so we use NBRB for it.
    if (from === 'BYN' || to === 'BYN') {
        return getNbrbHistoricalRate(from, to, date);
    }
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    const data = await currencyApiNetFetch('history', { date: formattedDate, base: 'USD' });
    if (data && data.rates) {
        const fromRate = from === 'USD' ? 1 : data.rates[from];
        const toRate = to === 'USD' ? 1 : data.rates[to];
        if (fromRate && toRate && fromRate !== 0) {
            return toRate / fromRate;
        }
    }
    return undefined;
}

async function getCurrencyApiDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
     if (from === 'BYN' || to === 'BYN') {
        return getNbrbDynamicsForPeriod(from, to, startDate, endDate);
    }

    const formattedStart = format(startDate, 'yyyy-MM-dd');
    const formattedEnd = format(endDate, 'yyyy-MM-dd');

    const data = await currencyApiNetFetch('timeframe', {
        start_date: formattedStart,
        end_date: formattedEnd,
        base: 'USD'
    });

    if (data && data.rates) {
        const result = Object.entries(data.rates).map(([date, dailyRates]: [string, any]) => {
            const fromRate = from === 'USD' ? 1 : dailyRates[from];
            const toRate = to === 'USD' ? 1 : dailyRates[to];
            
            if (fromRate && toRate && fromRate !== 0) {
                return {
                    date: format(parseISO(date), 'dd.MM'),
                    rate: toRate / fromRate
                };
            }
            return null;
        });
        return result.filter((d): d is { date: string; rate: number } => d !== null);
    }

    return [];
}


// --- NBRB PROVIDER ---
async function ensureNbrbFullCache() {
    if (nbrbFullCurrencyInfoCache) return;
    const data = await nbrbApiFetch('currencies');
    if (data) {
        nbrbFullCurrencyInfoCache = data.filter((c: any) => new Date(c.Cur_DateEnd) > new Date());
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
    if (nbrbCurrenciesCache) {
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

    currencies.sort((a, b) => a.code.localeCompare(b.code));
    
    nbrbCurrenciesCache = currencies;
    return nbrbCurrenciesCache;
}

function _updateNbrbRatesCache(): Promise<void> {
    if (Object.keys(nbrbRatesCache).length > 0) {
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

async function getNbrbDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
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
    }).filter((d): d is { date: string; rate: number } => d !== null);

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

export async function getLatestRates(pairs?: string[]): Promise<ExchangeRate[]> {
    const pairsToFetch = pairs ? pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to };
    }) : defaultPairs;

    return pairsToFetch.map(pair => ({
        ...pair,
        rate: findRate(pair.from, pair.to) ?? 0,
    })).filter(r => r.rate !== 0);
}

export function findRate(from: string, to: string): number | undefined {
    const fromIsCrypto = cryptoCodes.includes(from);
    const toIsCrypto = cryptoCodes.includes(to);

    if (from === to) return 1;

    // Case 1: Crypto involved, but no BYN. Always use CurrencyAPI.
    if ((fromIsCrypto || toIsCrypto) && from !== 'BYN' && to !== 'BYN') {
        return findCurrencyApiRate(from, to);
    }

    // Case 2: BYN is involved.
    if (from === 'BYN' || to === 'BYN') {
        const otherCode = from === 'BYN' ? to : from;
        const otherIsCrypto = cryptoCodes.includes(otherCode);

        if (otherIsCrypto) {
            // Bridge Crypto to BYN via USD
            const usdToBynRate = findNbrbRate('USD', 'BYN');
            const usdToCryptoRate = findCurrencyApiRate('USD', otherCode);
            
            if (usdToBynRate && usdToCryptoRate) {
                const bynToCryptoRate = usdToCryptoRate / usdToBynRate;
                return from === 'BYN' ? bynToCryptoRate : 1 / bynToCryptoRate;
            }
            return undefined;
        } else {
            // Standard BYN-fiat pair is always handled by NBRB
            return findNbrbRate(from, to);
        }
    }

    // Case 3: Standard fiat-fiat pair (non-BYN)
    if (activeDataSource === 'nbrb') {
        return findNbrbRate(from, to);
    } else { // currencyapi
        return findCurrencyApiRate(from, to);
    }
}

export async function findRateAsync(from: string, to: string): Promise<number | undefined> {
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
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

export async function preFetchInitialRates() {
    await Promise.all([
        _updateCurrencyApiRatesCache('USD'),
        _updateNbrbRatesCache()
    ]);
}
