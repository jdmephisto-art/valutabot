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
        nbrbFullCurrencyInfoCache = null;
        nbrbRatesCache = {};
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
        await updateNbrbRatesCache();
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
    const apiKey = 'cur_live_tJgYq8LtS5b5bgeCjSg0wHsozFqfe3sR6g485f83';

    const url = new URL(`https://api.currencyapi.com/v3/${endpoint}`);
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


// --- CURRENCYAPI.COM PROVIDER (v3) ---
let currencyApiCurrenciesCache: Currency[] | null = null;
let currencyApiRatesCache: { [key: string]: number } = {};
let lastCurrencyApiFetchTimestamp = 0;


async function getCurrencyApiCurrencies(): Promise<Currency[]> {
    if (currencyApiCurrenciesCache) {
        return currencyApiCurrenciesCache;
    }

    const data = await currencyApiFetch('currencies');
    
    if (data && data.data) {
        const result: Currency[] = Object.values(data.data).map((c: any) => ({
            code: c.code,
            name: c.name
        }));
        result.sort((a, b) => a.code.localeCompare(b.code));
        currencyApiCurrenciesCache = result;
        return result;
    }

    return [];
}

async function updateCurrencyApiRatesCache(baseCurrency = 'USD') {
    const data = await currencyApiFetch('latest', { base_currency: baseCurrency });
    if (data && data.data) {
        const tempCache: { [key: string]: number } = {};
        Object.values(data.data).forEach((rate: any) => {
            tempCache[rate.code] = rate.value;
        });
        tempCache[baseCurrency] = 1;
        currencyApiRatesCache = tempCache;
        lastCurrencyApiFetchTimestamp = Date.now();
    }
}

function findCurrencyApiRate(from: string, to: string): number | undefined {
    if (from === to) return 1;

    const fromRate = currencyApiRatesCache[from]; // Rate relative to base
    const toRate = currencyApiRatesCache[to];   // Rate relative to base

    // All rates are relative to the base currency (e.g., USD).
    // To convert from A to B: (A -> USD) / (B -> USD) is wrong.
    // Correct is: (value in A) * (USD per A) * (B per USD)
    // Or simpler: Rate of B / Rate of A (when both are vs USD)
    // e.g. from=EUR, to=JPY. base=USD. We have EUR/USD and JPY/USD. We want EUR/JPY.
    // (JPY/USD) / (EUR/USD) = JPY/EUR. This is to/from. We want from/to, so we inverse it.
    // Wait, no. We want how many `to` currency units for one `from` currency unit.
    // 1 EUR = ? JPY.
    // 1 EUR = 1.1 USD. 1 USD = 130 JPY.
    // So 1 EUR = 1.1 * 130 JPY.
    // toRate is how many target currency units per base. e.g. JPY/USD
    // fromRate is how many from currency units per base. e.g. EUR/USD
    // We want to find rate of `to` relative to `from`.
    // Example: Convert 10 EUR to JPY. Base is USD.
    // rates['EUR'] = 0.9 (means 1 USD = 0.9 EUR) -> 1/0.9 USD/EUR
    // rates['JPY'] = 130 (means 1 USD = 130 JPY) -> 130 JPY/USD
    // 10 EUR * (1/0.9 USD/EUR) * (130 JPY/USD) = 10 * 130 / 0.9 JPY
    // So the rate is toRate / fromRate.
    
    if (fromRate && toRate) {
        return toRate / fromRate;
    }
    return undefined;
}


async function getCurrencyApiLatestRates(): Promise<ExchangeRate[]> {
    if (Object.keys(currencyApiRatesCache).length === 0 || Date.now() - lastCurrencyApiFetchTimestamp > 5 * 60 * 1000) { // 5 min cache
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
    const formattedDate = format(date, 'yyyy-MM-dd');
    const data = await currencyApiFetch('historical', { date: formattedDate, base_currency: from, currencies: to });
    if (data && data.data && data.data[to]) {
        return data.data[to].value;
    }
    return undefined;
}

async function getCurrencyApiDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string, rate: number }[]> {
    const result: { date: string, rate: number }[] = [];
    let currentDate = startDate;

    const promises = [];
    while (currentDate <= endDate) {
        promises.push(getCurrencyApiHistoricalRate(from, to, currentDate));
        currentDate = addDays(currentDate, 1);
    }

    const rates = await Promise.all(promises);

    currentDate = startDate;
    for (const rate of rates) {
        if (rate !== undefined) {
            result.push({
                date: format(currentDate, 'dd.MM'),
                rate: rate
            });
        }
        currentDate = addDays(currentDate, 1);
    }
    
    return result;
}


// --- NBRB PROVIDER ---
let nbrbCurrenciesCache: Currency[] | null = null;
let nbrbFullCurrencyInfoCache: any[] | null = null;
let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};

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
            name: c.Cur_Name, // This name is in Russian, which is fine as a fallback
        }));
    }

    if (!currencies.some(c => c.code === 'BYN')) {
        currencies.push({ code: 'BYN', name: 'Белорусский рубль' });
    }

    currencies.sort((a, b) => a.code.localeCompare(b.code));
    
    nbrbCurrenciesCache = currencies;
    return nbrbCurrenciesCache;
}

async function updateNbrbRatesCache() {
    const dailyData = await nbrbApiFetch('rates?periodicity=0'); // 0 for daily
    const monthlyData = await nbrbApiFetch('rates?periodicity=1'); // 1 for monthly

    const tempCache: { [key: string]: { rate: number, scale: number } } = {};
    
    if (dailyData) {
        dailyData.forEach((r: any) => {
            tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
        });
    }

    if (monthlyData) {
        monthlyData.forEach((r: any) => {
            if (!tempCache[r.Cur_Abbreviation]) { // Don't overwrite daily rate with monthly
                tempCache[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
            }
        });
    }

    if (Object.keys(tempCache).length > 0) {
        nbrbRatesCache = tempCache;
    }
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
        return getNbrbCurrencies();
    } else {
        return getCurrencyApiCurrencies();
    }
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
