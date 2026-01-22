import type { Currency, ExchangeRate } from '@/lib/types';
import { format, subDays, differenceInDays, addDays } from 'date-fns';

const API_BASE_URL = 'https://api.currencyapi.com/v3';

// --- Caching ---
let currenciesCache: Currency[] | null = null;
let ratesCache: { [key: string]: number } = {};
let lastFetchTimestamp = 0;

function getApiKey(): string {
    const apiKey = process.env.NEXT_PUBLIC_CURRENCY_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        console.error("Currency API key not found or is a placeholder. Please set NEXT_PUBLIC_CURRENCY_API_KEY in your .env.local file.");
    }
    return apiKey || '';
}

// --- API Fetchers ---

async function apiFetch(endpoint: string, params: Record<string, string> = {}) {
    const apiKey = getApiKey();
    if (!apiKey) return null;

    const url = new URL(`${API_BASE_URL}/${endpoint}`);
    url.searchParams.append('apikey', apiKey);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            const errorBody = await response.json();
            console.error(`CurrencyAPI request failed: ${response.status} ${response.statusText}`, errorBody);
            return null;
        }
        return response.json();
    } catch (error) {
        console.error('Failed to fetch from CurrencyAPI:', error);
        return null;
    }
}

export const getCurrencies = async (): Promise<Currency[]> => {
    if (currenciesCache) {
        return currenciesCache;
    }

    const data = await apiFetch('currencies');

    if (data && data.data) {
        const currencyData = data.data;
        const result: Currency[] = Object.values(currencyData).map((c: any) => ({
            code: c.code,
            name: c.name,
        }));
        
        result.sort((a, b) => a.code.localeCompare(b.code));
        currenciesCache = result;
        return result;
    }
    return []; // Return empty on failure
}

async function updateRatesCache(baseCurrency = 'USD') {
    const data = await apiFetch('latest', { base_currency: baseCurrency });
    if (data && data.data) {
        const tempCache: { [key: string]: number } = {};
        Object.entries(data.data).forEach(([code, rateData]: [string, any]) => {
            tempCache[code] = rateData.value;
        });
        tempCache[baseCurrency] = 1; // Add base currency to cache
        ratesCache = tempCache; // Atomic update
        lastFetchTimestamp = Date.now();
    }
}

export const findRate = (from: string, to: string): number | undefined => {
    if (from === to) return 1;

    // Assumes a USD base for our cache
    const fromRate = ratesCache[from];
    const toRate = ratesCache[to];

    if (fromRate && toRate) {
        // We have Rate(USD->A) and Rate(USD->B). We want Rate(A->B)
        // Rate(A->B) = Rate(A->USD) * Rate(USD->B)
        // Rate(A->USD) = 1 / Rate(USD->A)
        // So, Rate(A->B) = (1 / fromRate) * toRate = toRate / fromRate
        return toRate / fromRate;
    }
    
    return undefined;
}

export const getLatestRates = async (): Promise<ExchangeRate[]> => {
    // This function is called periodically. It should update the cache.
    // The free plan of currencyapi.net updates hourly, so polling more often isn't useful.
    if (Date.now() - lastFetchTimestamp > 60 * 60 * 1000) {
        await updateRatesCache('USD');
    }

    const displayedPairs = [
        { from: 'USD', to: 'EUR' },
        { from: 'USD', to: 'GBP' },
        { from: 'USD', to: 'JPY' },
        { from: 'USD', to: 'RUB' },
        { from: 'USD', to: 'CNY' },
        { from: 'USD', to: 'BYN' },
    ];
    
    const ratesForUI: ExchangeRate[] = [];
    if (Object.keys(ratesCache).length > 0) {
        for (const pair of displayedPairs) {
            const rate = findRate(pair.from, pair.to);
            if (rate !== undefined) {
                ratesForUI.push({ ...pair, rate });
            }
        }
    }
    return ratesForUI;
};

export const getInitialRates = async (): Promise<ExchangeRate[]> => {
    await updateRatesCache('USD');
    return getLatestRates();
};

export const getHistoricalRate = async (from: string, to: string, date: Date): Promise<number | undefined> => {
    if (from === to) return 1;

    const formattedDate = format(date, 'yyyy-MM-dd');
    
    const data = await apiFetch('historical', { date: formattedDate, base_currency: from, currencies: to });
    
    if(data && data.data && data.data[to]) {
        return data.data[to].value;
    }
    
    console.warn(`Could not fetch historical rate for ${from}->${to} on ${formattedDate}`);
    return undefined;
};

export const getDynamicsForPeriod = async (from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> => {
    const results: { date: string, rate: number }[] = [];
    let currentDate = startDate;

    const promises: Promise<number | undefined>[] = [];
    const dates: Date[] = [];

    while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        promises.push(getHistoricalRate(from, to, currentDate));
        currentDate = addDays(currentDate, 1);
    }
    
    const rates = await Promise.all(promises);

    rates.forEach((rate, index) => {
        if (rate !== undefined) {
            const dateFormat = differenceInDays(endDate, startDate) > 365 ? 'dd.MM.yy' : 'dd.MM';
            results.push({
                date: format(dates[index], dateFormat),
                rate: rate,
            });
        }
    });

    return results;
}
