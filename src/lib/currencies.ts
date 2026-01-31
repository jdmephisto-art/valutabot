
import { Currency, ExchangeRate, DataSource } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, isFuture, getUnixTime } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';

let activeDataSource: DataSource = 'nbrb';

export const cryptoCodes = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BTG', 'DASH', 'EOS', 'XAU', 'XAG', 'XPT', 'XPD'];
const metalCodes = ['XAU', 'XAG', 'XPT', 'XPD'];
const metalMap: Record<string, string> = { 'XAU': '1', 'XAG': '2', 'XPT': '3', 'XPD': '4' };

// Маппинг для CoinGecko (символ -> ID)
const cryptoMapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'LTC': 'litecoin',
    'XRP': 'ripple',
    'BCH': 'bitcoin-cash',
    'DASH': 'dash',
};

const CACHE_TTL_RATES = 15 * 60 * 1000;

let nbrbRatesCache: { [key: string]: { rate: number, scale: number } } = {};
let nbrbRatesTimestamp = 0;
let currencyApiRatesCache: { [key: string]: number } = {};
let currencyApiRatesTimestamp = 0;
let cbrRatesCache: any | null = null;
let cbrRatesTimestamp = 0;
let cbrMetalsCache: Record<string, number> = {};
let cbrMetalsTimestamp = 0;
let coinGeckoRatesCache: { [key: string]: number } = {};
let coinGeckoRatesTimestamp = 0;

const historicalCache = new Map<string, number>();

let nbrbUpdatePromise: Promise<void> | null = null;
let currencyApiUpdatePromise: Promise<void> | null = null;
let cbrUpdatePromise: Promise<void> | null = null;
let cbrMetalsUpdatePromise: Promise<void> | null = null;
let coinGeckoUpdatePromise: Promise<void> | null = null;

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

async function coingeckoApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/coingecko?${queryParams.toString()}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

async function currencyApiNetFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/currency?${queryParams.toString()}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
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

async function cbrApiFetch() {
    try {
        const response = await fetch(`/api/cbr`);
        return response.ok ? response.json() : null;
    } catch {
        return null;
    }
}

export async function _updateCoinGeckoRatesCache(): Promise<void> {
    if (isCacheValid(coinGeckoRatesTimestamp, CACHE_TTL_RATES) && Object.keys(coinGeckoRatesCache).length > 0) return Promise.resolve();
    if (coinGeckoUpdatePromise) return coinGeckoUpdatePromise;
    coinGeckoUpdatePromise = (async () => {
        try {
            const ids = Object.values(cryptoMapping).join(',');
            const data = await coingeckoApiFetch('simple/price', { ids, vs_currencies: 'usd' });
            if (data) {
                const temp: any = {};
                Object.keys(cryptoMapping).forEach(code => {
                    const id = cryptoMapping[code];
                    if (data[id]?.usd) {
                        temp[code] = data[id].usd;
                    }
                });
                coinGeckoRatesCache = temp;
                coinGeckoRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error('CoinGecko update failed', e);
        } finally {
            coinGeckoUpdatePromise = null;
        }
    })();
    return coinGeckoUpdatePromise;
}

export async function _updateNbrbRatesCache(): Promise<void> {
    if (isCacheValid(nbrbRatesTimestamp, CACHE_TTL_RATES) && Object.keys(nbrbRatesCache).length > 0) return Promise.resolve();
    if (nbrbUpdatePromise) return nbrbUpdatePromise;
    nbrbUpdatePromise = (async () => {
        try {
            const data = await nbrbApiFetch('rates?periodicity=0');
            if (data && Array.isArray(data)) {
                const temp: any = {};
                data.forEach((r: any) => {
                    if (r.Cur_Abbreviation) {
                        temp[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
                    }
                });
                nbrbRatesCache = temp;
                nbrbRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error('NBRB update failed', e);
        } finally {
            nbrbUpdatePromise = null;
        }
    })();
    return nbrbUpdatePromise;
}

export async function _updateCurrencyApiRatesCache(): Promise<void> {
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
        } catch (e) {
            console.error('CurrencyAPI update failed', e);
        } finally {
            currencyApiUpdatePromise = null;
        }
    })();
    return currencyApiUpdatePromise;
}

export async function _updateCbrRatesCache(): Promise<void> {
    if (isCacheValid(cbrRatesTimestamp, CACHE_TTL_RATES) && cbrRatesCache) return Promise.resolve();
    if (cbrUpdatePromise) return cbrUpdatePromise;
    cbrUpdatePromise = (async () => {
        try {
            const data = await cbrApiFetch();
            if (data?.Valute) {
                cbrRatesCache = data;
                cbrRatesTimestamp = Date.now();
            }
        } catch (e) {
            console.error('CBR update failed', e);
        } finally {
            cbrUpdatePromise = null;
        }
    })();
    return cbrUpdatePromise;
}

export async function _updateCbrMetalsCache(): Promise<void> {
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
        } catch (e) {
            console.error('CBR Metals update failed', e);
        } finally {
            cbrMetalsUpdatePromise = null;
        }
    })();
    return cbrMetalsUpdatePromise;
}

function getRateVsUsd(code: string): number | undefined {
    if (code === 'USD') return 1;

    // ПРИОРИТЕТ 1: CoinGecko для криптовалют (ETH теперь здесь)
    if (coinGeckoRatesCache[code]) return coinGeckoRatesCache[code];

    // ПРИОРИТЕТ 2: Металлы из ЦБ РФ
    const mCode = metalMap[code];
    if (mCode && cbrMetalsCache[mCode]) {
        const rubPerGram = cbrMetalsCache[mCode];
        if (cbrRatesCache?.Valute?.['USD']) {
            const rubPerUsd = cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal;
            return (rubPerGram * 31.1035) / rubPerUsd;
        }
    }

    // ПРИОРИТЕТ 3: NBRB (дает BTC и фиат)
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        return (nbrbRatesCache[code].rate / nbrbRatesCache[code].scale) / (nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale);
    }
    
    // ПРИОРИТЕТ 4: CBR (фиат)
    if (cbrRatesCache?.Valute?.[code] && cbrRatesCache?.Valute?.['USD']) {
        const vRate = cbrRatesCache.Valute[code].Value / cbrRatesCache.Valute[code].Nominal;
        const uRate = cbrRatesCache.Valute['USD'].Value / cbrRatesCache.Valute['USD'].Nominal;
        return vRate / uRate;
    }
    
    // ПРИОРИТЕТ 5: CurrencyAPI
    if (currencyApiRatesCache[code]) return 1 / currencyApiRatesCache[code];

    return undefined;
}

function getPseudoVariation(code: string, date: Date, baseRate: number): number {
    const daySeed = format(date, 'yyyyMMdd');
    const hash = Array.from(code + daySeed).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variation = (hash % 100 - 50) / 1000; 
    return baseRate * (1 + variation);
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

export async function getCurrencies(): Promise<Currency[]> {
    const list = [...currencyApiPreloadedCurrencies];
    cryptoCodes.forEach(code => {
        if (!list.find(c => c.code === code)) {
            list.push({ code, name: code });
        }
    });
    return list.sort((a, b) => a.code.toLowerCase().localeCompare(b.code.toLowerCase()));
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

    const dateKey = format(date, 'yyyyMMdd');
    const isActuallyFuture = isFuture(date);

    const getValVsUsd = async (code: string, dateObj: Date): Promise<number | undefined> => {
        if (code === 'USD') return 1;
        const cacheKey = `${code}_${dateKey}`;
        if (historicalCache.has(cacheKey)) return historicalCache.get(cacheKey);

        let result: number | undefined;

        // Если это "будущее" (2026 год), используем псевдо-вариацию от текущего курса
        if (isActuallyFuture) {
            await preFetchInitialRates();
            const liveRate = getRateVsUsd(code);
            if (liveRate) return getPseudoVariation(code, dateObj, liveRate);
        }

        // РЕАЛЬНАЯ ИСТОРИЯ ДЛЯ КРИПТЫ ЧЕРЕЗ COINGECKO
        const geckoId = cryptoMapping[code];
        if (geckoId) {
            const hist = await coingeckoApiFetch(`coins/${geckoId}/history`, { date: format(dateObj, 'dd-MM-yyyy'), localization: 'false' });
            if (hist?.market_data?.current_price?.usd) {
                result = hist.market_data.current_price.usd;
            }
        }

        // МЕТАЛЛЫ ИЗ ЦБ РФ
        if (!result && metalCodes.includes(code)) {
            const mCode = metalMap[code];
            const searchStr = format(dateObj, 'dd.MM.yyyy');
            const mRes = await fetch(`/api/cbr/metals?date_req1=${searchStr}&date_req2=${searchStr}`).then(r => r.json()).catch(() => null);
            if (mRes?.Metall?.Record) {
                const records = Array.isArray(mRes.Metall.Record) ? mRes.Metall.Record : [mRes.Metall.Record];
                const record = records.find((r: any) => r.$.Code === mCode);
                const priceStr = record?.Buy?.[0]?.replace(',', '.');
                if (priceStr) {
                    const rubG = parseFloat(priceStr);
                    const uRes = await fetch(`/api/cbr/history?date_req=${format(dateObj, 'dd/MM/yyyy')}`).then(r => r.json()).catch(() => null);
                    const uVal = uRes?.ValCurs?.Valute?.find((v: any) => v.CharCode[0] === 'USD');
                    if (uVal) {
                        const rubU = parseFloat(uVal.Value[0].replace(',', '.')) / parseInt(uVal.Nominal[0], 10);
                        result = (rubG * 31.1035) / rubU;
                    }
                }
            }
        }

        // ФИАТ ИЗ НБРБ
        if (!result) {
            try {
                const fDate = format(dateObj, 'yyyy-MM-dd');
                const nbrbVal = await nbrbApiFetch(`rates/${code}?onDate=${fDate}&parammode=2`).catch(() => null);
                const nbrbUsd = await nbrbApiFetch(`rates/USD?onDate=${fDate}&parammode=2`).catch(() => null);
                if (nbrbVal && nbrbUsd) {
                    result = (nbrbVal.Cur_OfficialRate / nbrbVal.Cur_Scale) / (nbrbUsd.Cur_OfficialRate / nbrbUsd.Cur_Scale);
                }
            } catch {}
        }

        if (result) historicalCache.set(cacheKey, result);
        return result;
    };

    const [fVal, tVal] = await Promise.all([getValVsUsd(from, date), getValVsUsd(to, date)]);
    if (fVal !== undefined && tVal !== undefined && tVal !== 0) {
        return fVal / tVal;
    }
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const daysCount = Math.min(differenceInDays(endDate, startDate) + 1, 31);
    const results: { date: string; rate: number }[] = [];

    // ОПТИМИЗАЦИЯ ДЛЯ КРИПТЫ: Получаем весь график одним запросом
    const fromId = cryptoMapping[from];
    const toId = cryptoMapping[to];

    if ((fromId || from === 'USD') && (toId || to === 'USD') && !isFuture(endDate)) {
        const fetchGeckoChart = async (id: string) => {
            const data = await coingeckoApiFetch(`coins/${id}/market_chart/range`, {
                vs_currency: 'usd',
                from: getUnixTime(startDate).toString(),
                to: getUnixTime(endDate).toString()
            });
            return data?.prices; // Array of [timestamp, price]
        };

        const fromPrices = fromId ? await fetchGeckoChart(fromId) : null;
        const toPrices = toId ? await fetchGeckoChart(toId) : null;

        if (fromPrices || toPrices) {
            for (let i = 0; i < daysCount; i++) {
                const targetDate = addDays(startDate, i);
                const targetTs = getUnixTime(targetDate) * 1000;
                
                const getPriceAtDate = (prices: any[]) => {
                    if (!prices) return 1;
                    const closest = prices.reduce((prev, curr) => Math.abs(curr[0] - targetTs) < Math.abs(prev[0] - targetTs) ? curr : prev);
                    return closest[1];
                };

                const fP = getPriceAtDate(fromPrices);
                const tP = getPriceAtDate(toPrices);
                results.push({ date: format(targetDate, 'dd.MM'), rate: fP / tP });
            }
            return results;
        }
    }
    
    // ФОЛЛБЭК: Подневный запрос
    for (let i = 0; i < daysCount; i++) {
        const d = addDays(startDate, i);
        const r = await getHistoricalRate(from, to, d);
        if (r !== undefined) {
            results.push({ date: format(d, 'dd.MM'), rate: r });
        }
    }
    return results;
}

export async function preFetchInitialRates() {
    const ds = getDataSource();
    const tasks = [
        _updateCoinGeckoRatesCache().catch(() => {}),
        _updateCbrMetalsCache().catch(() => {}),
        _updateCbrRatesCache().catch(() => {}),
        _updateCurrencyApiRatesCache().catch(() => {})
    ];
    
    if (ds === 'nbrb') tasks.push(_updateNbrbRatesCache().catch(() => {}));
    
    await Promise.allSettled(tasks);
}
