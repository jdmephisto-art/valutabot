import type { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, startOfDay, parseISO } from 'date-fns';


// --- Pub/Sub for State Management ---
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach(l => l());
}

// --- STATE MANAGEMENT ---
let activeDataSource: DataSource = 'nbrb'; // Default data source

export function setDataSource(source: DataSource) {
    if (source !== activeDataSource) {
        activeDataSource = source;
        // Clear all caches to ensure fresh data from the new source
        nbrbCurrenciesCache = null;
        nbrbRatesCache = {};
        nbrbIdMap = null;
        currencyApiCurrenciesCache = null;
        currencyApiRatesCache = {};
        lastCurrencyApiFetchTimestamp = 0;
        notify(); // Notify subscribers of the change
    }
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

// --- SHARED ---
export async function getInitialRates(): Promise<ExchangeRate[]> {
    if (activeDataSource === 'nbrb') {
        return await getNbrbLatestRates();
    } else {
        await updateCurrencyApiRatesCache('USD');
        return await getCurrencyApiLatestRates();
    }
}

// --- API FETCH HELPERS ---
async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`);
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

async function currencyApiFetch(endpoint: string, params: Record<string, string> = {}) {
    // The key is hardcoded as per the user's request.
    const apiKey = '6431078d4fc8bf5d4097027ee62c2c0dc4e0';

    const url = new URL(`https://currencyapi.net/api/v1/${endpoint}`);
    url.searchParams.append('key', apiKey);
    url.searchParams.append('output', 'json');
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'application/json' }
        });
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


// --- CURRENCYAPI.NET PROVIDER (v1) ---
let currencyApiCurrenciesCache: Currency[] | null = null;
let currencyApiRatesCache: { [key: string]: number } = {};
let lastCurrencyApiFetchTimestamp = 0;
const PREDEFINED_CURRENCY_NAMES: { [key: string]: string } = {
    "AUD": "Australian Dollar", "BGN": "Bulgarian Lev", "BRL": "Brazilian Real", "CAD": "Canadian Dollar",
    "CHF": "Swiss Franc", "CNY": "Chinese Yuan", "CZK": "Czech Koruna", "DKK": "Danish Krone",
    "EUR": "Euro", "GBP": "British Pound", "HKD": "Hong Kong Dollar", "HRK": "Croatian Kuna",
    "HUF": "Hungarian Forint", "IDR": "Indonesian Rupiah", "ILS": "Israeli New Shekel",
    "INR": "Indian Rupee", "ISK": "Icelandic Króna", "JPY": "Japanese Yen", "KRW": "South Korean Won",
    "MXN": "Mexican Peso", "MYR": "Malaysian Ringgit", "NOK": "Norwegian Krone", "NZD": "New Zealand Dollar",
    "PHP": "Philippine Peso", "PLN": "Polish Złoty", "RON": "Romanian Leu", "RUB": "Russian Ruble",
    "SEK": "Swedish Krona", "SGD": "Singapore Dollar", "THB": "Thai Baht", "TRY": "Turkish Lira",
    "USD": "United States Dollar", "ZAR": "South African Rand", "BYN": "Belarusian Ruble"
};


async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    if (currencyApiCurrenciesCache) {
        return currencyApiCurrenciesCache;
    }
    // v1 doesn't have a /currencies endpoint. We derive the list from the /rates endpoint.
    await updateCurrencyApiRatesCache('USD'); // Ensure rates are fetched
    
    const codes = Object.keys(currencyApiRatesCache);
    
    // Ensure BYN is in the list for selection
    if (!codes.includes('BYN')) {
        codes.push('BYN');
    }

    const result: Currency[] = codes.map(code => ({
        code,
        name: PREDEFINED_CURRENCY_NAMES[code] || `${code} name not found`
    }));
    result.sort((a, b) => a.code.localeCompare(b.code));
    
    currencyApiCurrenciesCache = result;
    return result;
}

async function updateCurrencyApiRatesCache(baseCurrency = 'USD') {
    // NOTE: currencyapi.net (v1) free tier only supports USD as base currency.
    const data = await currencyApiFetch('rates', { base: baseCurrency });
    if (data && data.rates) {
        const tempCache: { [key: string]: number } = {};
        Object.entries(data.rates).forEach(([code, rate]: [string, any]) => {
            tempCache[code] = parseFloat(rate);
        });
        tempCache[baseCurrency] = 1;
        currencyApiRatesCache = tempCache;
        lastCurrencyApiFetchTimestamp = Date.now();
    }
    
    // --- Augmentation for BYN ---
    // If BYN is not in the cache from currencyapi, fetch it from NBRB as a fallback.
    // This assumes the base is USD, which is true for the free tier.
    if (baseCurrency === 'USD' && !currencyApiRatesCache['BYN']) {
        try {
            // Cur_ID for USD is 431. Fetch daily rate.
            const nbrbUsdRateData = await nbrbApiFetch('rates/431?periodicity=0'); 
            if (nbrbUsdRateData && nbrbUsdRateData.Cur_OfficialRate) {
                 // rate is BYN per `scale` USD.
                const bynPerUsd = nbrbUsdRateData.Cur_OfficialRate / nbrbUsdRateData.Cur_Scale;
                currencyApiRatesCache['BYN'] = bynPerUsd;
            }
        } catch (e) {
            console.error('Failed to augment cache with NBRB rate for BYN', e);
        }
    }
}

function findCurrencyApiRate(from: string, to: string): number | undefined {
    if (from === to) return 1;

    // Rates in cache are relative to USD.
    const fromRate = currencyApiRatesCache[from]; // FROM per USD
    const toRate = currencyApiRatesCache[to];     // TO per USD

    if (fromRate && toRate) {
        // We want 'TO per FROM'.
        // (TO / USD) / (FROM / USD) = TO / FROM
        return toRate / fromRate;
    }
    return undefined;
}


async function getCurrencyApiLatestRates(): Promise<ExchangeRate[]> {
    // Free tier updates infrequently, but we can have a shorter cache for demo purposes
    if (Date.now() - lastCurrencyApiFetchTimestamp > 5 * 60 * 1000) { // 5 min cache
        await updateCurrencyApiRatesCache('USD');
    }
    const displayedPairs = [
        { from: 'USD', to: 'EUR' }, { from: 'EUR', to: 'USD' }, { from: 'USD', to: 'BYN' },
        { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'RUB' }, { from: 'EUR', to: 'RUB' },
    ];
    return displayedPairs.map(pair => ({
        ...pair,
        rate: findCurrencyApiRate(pair.from, pair.to) ?? 0,
    })).filter(r => r.rate !== 0);
}

async function getCurrencyApiHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    console.warn("Historical data is not supported by the provided currencyapi.net API key (v1).");
    return undefined;
}

async function getCurrencyApiDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
    console.warn("Historical data is not supported by the provided currencyapi.net API key (v1).");
    return [];
}


// --- NBRB PROVIDER ---
let nbrbCurrenciesCache: (Currency & { id: number, dateEnd: string })[] | null = null;
let nbrbIdMap: { [key: string]: number } | null = null;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};

async function getNbrbCurrencies(): Promise<Currency[]> {
    if (!nbrbCurrenciesCache) {
        const data = await nbrbApiFetch('currencies');
        if (data) {
            nbrbCurrenciesCache = data
                .filter((c: any) => new Date(c.Cur_DateEnd) > new Date())
                .map((c: any) => ({
                    code: c.Cur_Abbreviation,
                    name: c.Cur_Name_Eng,
                    id: c.Cur_ID,
                    dateEnd: c.Cur_DateEnd,
                }));
            
            nbrbIdMap = nbrbCurrenciesCache.reduce((acc, cur) => {
                acc[cur.code] = cur.id;
                return acc;
            }, {} as {[key: string]: number});
        }
    }
    
    if (nbrbCurrenciesCache) {
        const currencies: Currency[] = nbrbCurrenciesCache.map(({ id, dateEnd, ...rest }) => rest);
        
        if (!currencies.some(c => c.code === 'BYN')) {
            currencies.push({ code: 'BYN', name: 'Belarusian Ruble' });
        }

        currencies.sort((a, b) => a.code.localeCompare(b.code));
        return currencies;
    }

    return [];
}

async function updateNbrbRatesCache() {
    const data = await nbrbApiFetch('rates?periodicity=0'); // 0 for daily
    if (data) {
        const tempCache: { [key: string]: { rate: number, scale: number } } = {};
        data.forEach((r: any) => {
            tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
        });
        nbrbRatesCache = tempCache;
    }
}

function findNbrbRate(from: string, to: string): number | undefined {
    if (Object.keys(nbrbRatesCache).length === 0) return undefined;
    if (from === to) return 1;

    // NBRB rates are all X -> BYN.
    const toRateInfo = nbrbRatesCache[to];
    const fromRateInfo = nbrbRatesCache[from];
    
    const rateToBynForFROM = from === 'BYN' ? 1 : (fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined);
    const rateToBynForTO = to === 'BYN' ? 1 : (toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined);

    if (rateToBynForFROM !== undefined && rateToBynForTO !== undefined) {
        // We want to find how many TO for 1 FROM.
        // 1 FROM = rateToBynForFROM BYN
        // 1 TO   = rateToBynForTO BYN => 1 BYN = 1/rateToBynForTO TO
        // So, 1 FROM = rateToBynForFROM * (1/rateToBynForTO) TO
        return rateToBynForFROM / rateToBynForTO;
    }
    return undefined;
}

async function getNbrbLatestRates(): Promise<ExchangeRate[]> {
    if (Object.keys(nbrbRatesCache).length === 0) {
        await updateNbrbRatesCache();
    }
    const displayedPairs = [
        { from: 'USD', to: 'EUR' }, { from: 'EUR', to: 'USD' }, { from: 'USD', to: 'BYN' },
        { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'RUB' }, { from: 'EUR', to: 'RUB' },
    ];
     return displayedPairs.map(pair => ({
        ...pair,
        rate: findNbrbRate(pair.from, pair.to) ?? 0,
    })).filter(r => r.rate !== 0);
}

async function getNbrbHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    if (!nbrbIdMap) await getNbrbCurrencies(); // Ensure map is populated
    
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
    
    if (rateToBynForFROM !== undefined && rateToBynForTO !== undefined) {
        return rateToBynForFROM / rateToBynForTO;
    }
    return undefined;
}

async function getNbrbDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
    if (!nbrbIdMap) await getNbrbCurrencies();
    
    const formattedStart = format(startDate, 'yyyy-MM-dd');
    const formattedEnd = format(endDate, 'yyyy-MM-dd');

    const getDynamicsForCode = async (code: string) => {
        if (code === 'BYN') {
            const days = differenceInDays(endDate, startDate) + 1;
            return Array.from({ length: days }).map((_, i) => ({ date: addDays(startDate, i), rate: 1, scale: 1 }));
        }
        const id = nbrbIdMap?.[code];
        if (!id) return [];
        const data = await nbrbApiFetch(`rates/dynamics/${id}?startdate=${formattedStart}&enddate=${formattedEnd}`);
        return data.map((r: any) => ({ date: parseISO(r.Date), rate: r.Cur_OfficialRate, scale: r.Cur_Scale }));
    };

    const [fromDynamics, toDynamics] = await Promise.all([getDynamicsForCode(from), getDynamicsForCode(to)]);

    const toMap = new Map(toDynamics.map(d => [format(d.date, 'yyyy-MM-dd'), { rate: d.rate, scale: d.scale }]));
    
    const result = fromDynamics.map(fromDay => {
        const toDay = toMap.get(format(fromDay.date, 'yyyy-MM-dd'));
        if (toDay) {
            const rateToBynForFROM = fromDay.rate / fromDay.scale;
            const rateToBynForTO = toDay.rate / toDay.scale;
            return {
                date: format(fromDay.date, 'dd.MM'),
                rate: rateToBynForFROM / rateToBynForTO,
            };
        }
        return null;
    }).filter(d => d !== null);

    return result as { date: string, rate: number }[];
}

// --- UNIFIED API ---
export async function getCurrencies(): Promise<Currency[]> {
    return activeDataSource === 'nbrb' ? getNbrbCurrencies() : getCurrencyApiCurrencies();
}

export async function getLatestRates(): Promise<ExchangeRate[]> {
    if (activeDataSource === 'nbrb') {
        return await getNbrbLatestRates();
    } else {
        return await getCurrencyApiLatestRates();
    }
}

export function findRate(from: string, to: string): number | undefined {
    return activeDataSource === 'nbrb' ? findNbrbRate(from, to) : findCurrencyApiRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    return activeDataSource === 'nbrb' ? getNbrbHistoricalRate(from, to, date) : getCurrencyApiHistoricalRate(from, to, date);
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    return activeDataSource === 'nbrb' ? getNbrbDynamicsForPeriod(from, to, startDate, endDate) : getCurrencyApiDynamicsForPeriod(from, to, startDate, endDate);
}
