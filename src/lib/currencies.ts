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
        return getCurrencyApiLatestRates();
    }
}


// --- CURRENCYAPI.NET PROVIDER ---
const CURRENCY_API_BASE_URL = 'https://api.currencyapi.com/v3';
let currencyApiCurrenciesCache: Currency[] | null = null;
let currencyApiRatesCache: { [key: string]: number } = {};
let lastCurrencyApiFetchTimestamp = 0;

function getCurrencyApiKey(): string {
    const apiKey = process.env.NEXT_PUBLIC_CURRENCY_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        console.error("Currency API key not found or is a placeholder. Please set NEXT_PUBLIC_CURRENCY_API_KEY in your .env.local file.");
    }
    return apiKey || '';
}

async function currencyApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const apiKey = getCurrencyApiKey();
    if (!apiKey) return null;

    const url = new URL(`${CURRENCY_API_BASE_URL}/${endpoint}`);
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

async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    if (currencyApiCurrenciesCache) {
        return currencyApiCurrenciesCache;
    }
    const data = await currencyApiFetch('currencies');
    if (data && data.data) {
        const result: Currency[] = Object.values(data.data).map((c: any) => ({
            code: c.code,
            name: c.name,
        }));
        result.sort((a, b) => a.name.localeCompare(b.name));
        currencyApiCurrenciesCache = result;
        return result;
    }
    return [];
}

async function updateCurrencyApiRatesCache(baseCurrency = 'USD') {
    const data = await currencyApiFetch('latest', { base_currency: baseCurrency });
    if (data && data.data) {
        const tempCache: { [key: string]: number } = {};
        Object.entries(data.data).forEach(([code, rateData]: [string, any]) => {
            tempCache[code] = rateData.value;
        });
        tempCache[baseCurrency] = 1;
        currencyApiRatesCache = tempCache;
        lastCurrencyApiFetchTimestamp = Date.now();
    }
}

function findCurrencyApiRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    const fromRate = currencyApiRatesCache[from]; // Rate USD -> FROM
    const toRate = currencyApiRatesCache[to];     // Rate USD -> TO
    if (fromRate && toRate) {
        return toRate / fromRate; // Rate FROM -> TO
    }
    return undefined;
}

async function getCurrencyApiLatestRates(): Promise<ExchangeRate[]> {
    if (Date.now() - lastCurrencyApiFetchTimestamp > 60 * 60 * 1000) { // 1 hour cache
        await updateCurrencyApiRatesCache('USD');
    }
    const displayedPairs = [
        { from: 'USD', to: 'EUR' }, { from: 'USD', to: 'GBP' }, { from: 'USD', to: 'JPY' },
        { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'BYN' }, { from: 'USD', to: 'CNY' },
    ];
    return displayedPairs.map(pair => ({
        ...pair,
        rate: findCurrencyApiRate(pair.from, pair.to) ?? 0,
    })).filter(r => r.rate !== 0);
}

async function getCurrencyApiHistoricalRate(from: string, to: string, date: Date): Promise<number | undefined> {
    if (from === to) return 1;
    const formattedDate = format(date, 'yyyy-MM-dd');
    const data = await currencyApiFetch('historical', { date: formattedDate, base_currency: from, currencies: to });
    if(data && data.data && data.data[to]) {
        return data.data[to].value;
    }
    return undefined;
}

async function getCurrencyApiDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
    const resultsWithDate: { date: Date, rate: number }[] = [];
    const promises: Promise<{ date: Date, rate: number | undefined }>[] = [];
    
    for (let d = startOfDay(startDate); d <= endDate; d = addDays(d, 1)) {
        const currentDate = new Date(d);
        promises.push(getCurrencyApiHistoricalRate(from, to, currentDate).then(rate => ({ date: currentDate, rate })));
    }

    const settled = await Promise.all(promises);
    settled.forEach(res => {
         if (res.rate !== undefined) {
            resultsWithDate.push({
                date: res.date,
                rate: res.rate,
            });
        }
    });

    resultsWithDate.sort((a, b) => a.date.getTime() - b.date.getTime());

    return resultsWithDate.map(res => ({
        date: format(res.date, 'dd.MM'),
        rate: res.rate
    }));
}


// --- NBRB PROVIDER ---
const NBRB_API_BASE_URL = 'https://api.nbrb.by/exrates';
let nbrbCurrenciesCache: (Currency & { id: number, dateEnd: string })[] | null = null;
let nbrbIdMap: { [key: string]: number } | null = null;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};

async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`${NBRB_API_BASE_URL}/${endpoint}`);
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

async function getNbrbCurrencies(): Promise<Currency[]> {
    if (!nbrbCurrenciesCache) {
        const data = await nbrbApiFetch('currencies');
        if (data) {
            nbrbCurrenciesCache = data
                .filter((c: any) => new Date(c.Cur_DateEnd) > new Date())
                .map((c: any) => ({
                    code: c.Cur_Abbreviation,
                    name: c.Cur_Name,
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
            currencies.push({ code: 'BYN', name: 'Белорусский рубль' });
        }

        currencies.sort((a, b) => a.name.localeCompare(b.name, 'ru'));

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

    const toRateInfo = nbrbRatesCache[to];
    const fromRateInfo = nbrbRatesCache[from];
    
    const bynToFrom = from === 'BYN' ? 1 : (fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined);
    const bynToTo = to === 'BYN' ? 1 : (toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined);

    if (bynToFrom !== undefined && bynToTo !== undefined) {
        return bynToFrom / bynToTo;
    }
    return undefined;
}

async function getNbrbLatestRates(): Promise<ExchangeRate[]> {
    if (Object.keys(nbrbRatesCache).length === 0) {
        await updateNbrbRatesCache();
    }
    const displayedPairs = [
        { from: 'USD', to: 'EUR' }, { from: 'USD', to: 'GBP' }, { from: 'USD', to: 'JPY' },
        { from: 'EUR', to: 'BYN' }, { from: 'USD', to: 'BYN' }, { from: 'USD', to: 'CNY' },
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
    
    const bynToFrom = fromRateInfo ? fromRateInfo.rate / fromRateInfo.scale : undefined;
    const bynToTo = toRateInfo ? toRateInfo.rate / toRateInfo.scale : undefined;
    
    if (bynToFrom !== undefined && bynToTo !== undefined) {
        return bynToFrom / bynToTo;
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
    
    return fromDynamics.map(fromDay => {
        const toDay = toMap.get(format(fromDay.date, 'yyyy-MM-dd'));
        if (toDay) {
            const bynToFrom = fromDay.rate / fromDay.scale;
            const bynToTo = toDay.rate / toDay.scale;
            return {
                date: format(fromDay.date, 'dd.MM'),
                rate: bynToFrom / bynToTo,
            };
        }
        return null;
    }).filter(d => d !== null) as { date: string, rate: number }[];
}

// --- UNIFIED API ---
export async function getCurrencies(): Promise<Currency[]> {
    return activeDataSource === 'nbrb' ? getNbrbCurrencies() : getCurrencyApiCurrencies();
}

export async function getLatestRates(): Promise<ExchangeRate[]> {
    return activeDataSource === 'nbrb' ? getNbrbLatestRates() : getCurrencyApiLatestRates();
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
