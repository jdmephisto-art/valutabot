import { Currency, ExchangeRate, DataSource, HistoricalRateResult, MultiSourceData } from '@/lib/types';
import { format, addDays, startOfDay, eachDayOfInterval, endOfDay, isAfter } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, collection, addDoc, Firestore, onSnapshot, query, where, getDocs, Timestamp } from 'firebase/firestore';

let activeDataSource: DataSource = 'nbrb';

// Сессионный кэш для предотвращения повторных запросов в рамках одного сеанса
const sessionCache = new Map<string, any>();

export const metalsCodes = ['XAU', 'XAG', 'XPT', 'XPD'];
export const popularCryptoCodes = ['BTC', 'ETH', 'TON', 'SOL', 'USDT', 'BNB', 'XRP', 'USDC', 'ADA', 'DOGE', 'TRX', 'LINK', 'MATIC', 'AVAX', 'DOT', 'UNI', 'SHIB', 'DAI', 'LTC', 'NEAR'];

export const fiatCodes = [
    'AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BGN', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNY', 'COP', 'CRC', 'CUC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HRK', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLL', 'SOS', 'SRD', 'SSP', 'STN', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XDR', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWL'
];

export const curatedAltcoinCodes = [
    'NOT', 'DOGS', 'FET', 'RNDR', 'AGIX', 'AAVE', 'MKR', 'SAND', 'MANA', 'AXS', 'IMX',
    'PEPE', 'FLOKI', 'BONK', 'FIL', 'AR', 'STORJ', 'HNT', 'THETA', 'ONDO', 'OKB', 'CRO',
    'ATOM', 'ARB', 'OP', 'ICP', 'ETC', 'XMR', 'XLM', 'SUI', 'APT', 'HBAR', 'STX', 'TAO',
    'TIA', 'SEI', 'INJ', 'GALA', '1INCH', 'GRT', 'RUNE', 'LDO', 'BCH', 'FTM', 'EOS', 'VET',
    'ENA', 'JUP', 'PYTH', 'STRK', 'W', 'DYM', 'SAGA', 'TNSR', 'RENDER', 'PENDLE'
];

// Маппинг для CoinGecko
export const cryptoMapping: Record<string, string> = { 
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'TON': 'the-open-network', 'SOL': 'solana', 
    'FET': 'fetch-ai', 'RNDR': 'render-token', 'BNB': 'binancecoin', 'NEAR': 'near', 
    'ATOM': 'cosmos', 'ARB': 'arbitrum', 'OP': 'optimism', 'LTC': 'litecoin',
    'XRP': 'ripple', 'BCH': 'bitcoin-cash', 'DOGE': 'dogecoin', 'ADA': 'cardano', 
    'DOT': 'polkadot', 'NOT': 'notcoin', 'DOGS': 'dogs', 'USDT': 'tether', 'USDC': 'usd-coin',
    'MANA': 'decentraland', 'AAVE': 'aave', 'IMX': 'immutable-x', 'AR': 'arweave',
    'UNI': 'uniswap', 'MKR': 'maker', 'SAND': 'the-sandbox', 'AXS': 'axie-infinity',
    'SHIB': 'shiba-inu', 'PEPE': 'pepe', 'FLOKI': 'floki', 'BONK': 'bonk',
    'FIL': 'filecoin', 'STORJ': 'storj', 'HNT': 'helium', 'THETA': 'theta-token',
    'ONDO': 'ondo-finance', 'OKB': 'okb', 'CRO': 'crypto-com-chain',
    'TRX': 'tron', 'LINK': 'chainlink', 'AGIX': 'singularitynet',
    'ENA': 'ethena', 'JUP': 'jupiter-exchange', 'PYTH': 'pyth-network',
    'STRK': 'starknet', 'W': 'wormhole', 'DYM': 'dymension', 'SAGA': 'saga',
    'TNSR': 'tnsr', 'PENDLE': 'pendle', 'APT': 'aptos', 'SUI': 'sui', 'RENDER': 'render-token'
};

let unifiedData: MultiSourceData = {};
let unifiedDataTomorrow: MultiSourceData = {};

const FIAT_TTL = 60 * 60 * 1000; 
const CRYPTO_TTL = 5 * 60 * 1000; 

export function setDataSource(source: DataSource) { activeDataSource = source; }
export function getDataSource(): DataSource { return activeDataSource; }

export function findRateWithDate(from: string, to: string, isFuture: boolean = false): { rate: number | undefined, date: string | undefined } {
    if (from === to) return { rate: 1, date: undefined };

    const getBestData = (currency: string): { v: number | undefined, d: string | undefined } => {
        if (currency === 'USD') return { v: 1, d: undefined };
        const targetMap = isFuture ? unifiedDataTomorrow : unifiedData;
        
        const sourcesToCheck: DataSource[] = [
            activeDataSource,
            'nbrb', 'cbr', 'nbk', 'ecb',
            'worldcurrencyapi', 'coingecko' as any
        ];

        for (const src of sourcesToCheck) {
            const entry = targetMap[currency]?.[src];
            if (entry) return { v: entry.v, d: entry.d };
        }

        return { v: undefined, d: undefined };
    };

    const fromData = getBestData(from);
    const toData = getBestData(to);
    
    if (fromData.v !== undefined && toData.v !== undefined && toData.v !== 0) {
        const effectiveDate = fromData.d || toData.d;
        return { rate: fromData.v / toData.v, date: effectiveDate };
    }
    return { rate: undefined, date: undefined };
}

export function findRate(from: string, to: string, isTomorrow: boolean = false): number | undefined {
    return findRateWithDate(from, to, isTomorrow).rate;
}

// Global promise to prevent multiple initial fetches
let initialFetchPromise: Promise<void> | null = null;
let isInitialFetchDone = false;
let isListenerSet = false;

export async function preFetchInitialRates(db: Firestore, onApiError?: (source: string) => void) {
    if (isInitialFetchDone) return;
    if (initialFetchPromise) return initialFetchPromise;

    initialFetchPromise = (async () => {
        const docRef = doc(db, 'rates_cache', 'unified');
        try {
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                unifiedData = data.data || {};
                unifiedDataTomorrow = data.dataTomorrow || {};
            }
            
            if (!isListenerSet) {
                onSnapshot(docRef, (s) => {
                    if (s.exists()) {
                        const d = s.data();
                        unifiedData = d.data || {};
                        unifiedDataTomorrow = d.dataTomorrow || {};
                    }
                });
                isListenerSet = true;
            }

            const now = Date.now();
            const cacheData = snap.exists() ? snap.data() : null;
            const updateFiat = !snap.exists() || (now - (cacheData?.updatedAtFiat || 0) > FIAT_TTL);
            const updateCrypto = !snap.exists() || (now - (cacheData?.updatedAtCrypto || 0) > CRYPTO_TTL);

            if (updateFiat || updateCrypto) {
                await updateAllRatesInCloud(db, updateFiat, onApiError, updateCrypto);
            }
            isInitialFetchDone = true;
        } catch (e) {
            console.error("preFetchInitialRates failed:", e);
        } finally {
            initialFetchPromise = null;
        }
    })();

    return initialFetchPromise;
}

export async function updateAllRatesInCloud(db: Firestore, updateFiat: boolean = true, onApiError?: (source: string) => void, updateCrypto: boolean = true) {
    const now = Date.now();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const sources = [
        { id: 'nbrb', fn: fetchNbrb, type: 'fiat' },
        { id: 'cbr', fn: fetchCbr, type: 'fiat' },
        { id: 'ecb', fn: fetchEcb, type: 'fiat' },
        { id: 'nbk', fn: fetchNbk, type: 'fiat' },
        { id: 'coingecko', fn: fetchCoinGecko, type: 'crypto' },
        { id: 'worldcurrencyapi', fn: fetchWorldCurrency, type: 'fiat' }
    ];

    const activeSources = sources.filter(s => (s.type === 'fiat' && updateFiat) || (s.type === 'crypto' && updateCrypto));
    if (activeSources.length === 0) return unifiedData;

    const prioritySource = activeSources.find(s => s.id === activeDataSource) || activeSources[0];
    const otherSources = activeSources.filter(s => s.id !== prioritySource.id);

    const nextData = { ...unifiedData };
    const nextDataTomorrow = { ...unifiedDataTomorrow };

    const processSourceResult = (val: any, sourceId: string, isOfficial: boolean, isCrypto: boolean) => {
        if (!val) return;
        const processEntry = (rates: Record<string, number>, dateStr: string) => {
            // Если это крипто-источник, мы ВСЕГДА пишем только в nextData (текущие), игнорируя logic "на завтра"
            const shouldWriteToTomorrow = dateStr > todayStr && !isCrypto;
            const targetMap = shouldWriteToTomorrow ? nextDataTomorrow : nextData;
            
            Object.keys(rates).forEach(currency => {
                if (!targetMap[currency]) targetMap[currency] = {};
                targetMap[currency][sourceId] = { v: rates[currency], d: dateStr, off: isOfficial };
            });
        };
        if (val.today) processEntry(val.today.rates, val.today.date);
        if (val.tomorrow) processEntry(val.tomorrow.rates, val.tomorrow.date);
        if (val.rates && val.date) processEntry(val.rates, val.date);
    };

    try {
        const priorityRes = await prioritySource.fn();
        processSourceResult(priorityRes, prioritySource.id, prioritySource.type === 'fiat', prioritySource.type === 'crypto');
        
        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData, 
            dataTomorrow: nextDataTomorrow, 
            updatedAtFiat: updateFiat ? now : (Object.keys(unifiedData).length > 0 ? now : 0),
            updatedAtCrypto: updateCrypto ? now : (Object.keys(unifiedData).length > 0 ? now : 0)
        }, { merge: true });
        
        unifiedData = nextData;
        unifiedDataTomorrow = nextDataTomorrow;
    } catch (e) {
        if (onApiError) onApiError(prioritySource.id);
    }

    (async () => {
        const results = await Promise.allSettled(otherSources.map(s => s.fn()));
        results.forEach((res, idx) => {
            const sInfo = otherSources[idx];
            if (res.status === 'fulfilled' && res.value) {
                processSourceResult(res.value, sInfo.id, sInfo.type === 'fiat', sInfo.type === 'crypto');
            } else if (onApiError) {
                onApiError(sInfo.id);
            }
        });

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            data: nextData, 
            dataTomorrow: nextDataTomorrow, 
            updatedAtFiat: updateFiat ? now : (Object.keys(unifiedData).length > 0 ? now : 0),
            updatedAtCrypto: updateCrypto ? now : (Object.keys(unifiedData).length > 0 ? now : 0)
        }, { merge: true });
        
        unifiedData = nextData;
        unifiedDataTomorrow = nextDataTomorrow;
    })();

    return unifiedData;
}

async function fetchNbrb() {
    try {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');
        const mondayStr = format(addDays(new Date(), 3), 'yyyy-MM-dd');

        const datesToFetch = [todayStr, tomorrowStr];
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 5 || dayOfWeek === 6) datesToFetch.push(mondayStr);

        const fetchResults = await Promise.all(
            datesToFetch.map(async (d) => {
                const res = await fetch(`https://api.nbrb.by/exrates/rates?ondate=${d}&periodicity=0`, { cache: 'no-store' });
                if (!res.ok) return null;
                const data = await res.json();
                if (!Array.isArray(data) || data.length === 0) return null;
                
                const r: Record<string, number> = { 'BYN': 1 };
                data.forEach((item: any) => { r[item.Cur_Abbreviation] = item.Cur_OfficialRate / item.Cur_Scale; });
                const usd = r['USD'];
                if (!usd) return null;
                
                const norm: Record<string, number> = {};
                Object.keys(r).forEach(c => { norm[c] = r[c] / usd; });
                return { rates: norm, date: d };
            })
        );

        return { today: fetchResults[0], tomorrow: fetchResults.slice(1).reverse().find(res => res !== null) || null };
    } catch (e) { return null; }
}

async function fetchCbr() {
    try {
        const today = new Date();
        const tomorrow = addDays(today, 1);
        const tomStr = format(tomorrow, 'dd/MM/yyyy');
        
        const [resJson, resXml] = await Promise.all([
            fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' }),
            fetch(`/api/cbr/history?date_req=${tomStr}`, { cache: 'no-store' })
        ]);

        const ratesToday: Record<string, number> = {};
        let dateToday = format(today, 'yyyy-MM-dd');

        if (resJson.ok) {
            const data = await resJson.json();
            const rubPerUsd = data?.Valute?.USD?.Value;
            if (rubPerUsd) {
                ratesToday['RUB'] = 1 / rubPerUsd;
                Object.keys(data.Valute).forEach(code => {
                    const v = data.Valute[code];
                    ratesToday[code] = (v.Value / v.Nominal) / rubPerUsd;
                });
            }
            if (data.Date) dateToday = data.Date.split('T')[0];
        }

        const ratesTomorrow: Record<string, number> = {};
        let dateTom = format(tomorrow, 'yyyy-MM-dd');
        
        if (resXml.ok) {
            const data = await resXml.json();
            if (data?.ValCurs?.Valute) {
                const valutes = Array.isArray(data.ValCurs.Valute) ? data.ValCurs.Valute : [data.ValCurs.Valute];
                const usd = valutes.find((v: any) => v.CharCode[0] === 'USD');
                if (usd) {
                    const rubPerUsd = parseFloat(usd.Value[0].replace(',', '.'));
                    ratesTomorrow['RUB'] = 1 / rubPerUsd;
                    valutes.forEach((v: any) => {
                        const code = v.CharCode[0];
                        const val = parseFloat(v.Value[0].replace(',', '.'));
                        const nom = parseInt(v.Nominal[0]);
                        ratesTomorrow[code] = (val / nom) / rubPerUsd;
                    });
                    if (data.ValCurs.$.Date) {
                        const [d, m, y] = data.ValCurs.$.Date.split('.');
                        dateTom = `${y}-${m}-${d}`;
                    }
                }
            }
        }

        return {
            today: { rates: ratesToday, date: dateToday },
            tomorrow: Object.keys(ratesTomorrow).length > 0 ? { rates: ratesTomorrow, date: dateTom } : null
        };
    } catch { return null; }
}

async function fetchCoinGecko() {
    try {
        const ids = Object.values(cryptoMapping).join(',');
        const res = await fetch(`/api/coingecko?endpoint=simple/price&ids=${ids}&vs_currencies=usd`, { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        Object.keys(cryptoMapping).forEach(code => {
            const id = cryptoMapping[code];
            if (data[id]?.usd) rates[code] = data[id].usd;
        });
        return { rates, date: format(new Date(), 'yyyy-MM-dd') };
    } catch { return null; }
}

async function fetchWorldCurrency() {
    try {
        const res = await fetch('/api/worldcurrency?endpoint=rates&base=USD', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.rates) {
            Object.keys(data.rates).forEach(code => { 
                if (data.rates[code] > 0) rates[code] = 1 / data.rates[code]; 
            });
            if (data.rates['BYR'] && !data.rates['BYN']) rates['BYN'] = 1 / data.rates['BYR'];
        }
        return { rates, date: format(new Date(), 'yyyy-MM-dd') };
    } catch { return null; }
}

async function fetchEcb() {
  try {
    const res = await fetch('/api/ecb');
    if (!res.ok) return null;
    const ecbData = await res.json();
    const rates: Record<string, number> = {};
    const eurInUsd = 1 / (ecbData['USD'] || 1);
    Object.keys(ecbData).forEach(code => { rates[code] = (1 / ecbData[code]) / eurInUsd; });
    return { rates, date: format(new Date(), 'yyyy-MM-dd') };
  } catch { return null; }
}

async function fetchNbk() {
  try {
    const res = await fetch('/api/nbk');
    if (!res.ok) return null;
    const nbkData = await res.json();
    const rates: Record<string, number> = {};
    const usdInKzt = nbkData['USD'];
    if (usdInKzt) {
      rates['KZT'] = 1 / usdInKzt;
      Object.keys(nbkData).forEach(code => { rates[code] = nbkData[code] / usdInKzt; });
    }
    return { rates, date: format(new Date(), 'yyyy-MM-dd') };
  } catch { return null; }
}

export async function getCurrencies(): Promise<Currency[]> {
    const approvedCodes = new Set([...fiatCodes, ...metalsCodes, ...popularCryptoCodes, ...curatedAltcoinCodes]);
    const preloadedMap = new Map(currencyApiPreloadedCurrencies.map(c => [c.code, c]));
    return Array.from(approvedCodes).map(code => ({ code, name: preloadedMap.get(code)?.name || code })).sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db: Firestore): Promise<ExchangeRate[]> {
    if (Object.keys(unifiedData).length === 0) {
        await preFetchInitialRates(db); 
    }
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return pairs.map(p => {
        const [from, to] = p.split('/');
        const todayData = findRateWithDate(from, to, false);
        const futureData = findRateWithDate(from, to, true);
        
        // Показываем прогноз на завтра только если его дата реально в будущем
        const showTomorrow = futureData.rate !== undefined && futureData.date && futureData.date > todayStr;
        
        return { 
            from, 
            to, 
            rate: todayData.rate, 
            tomorrowRate: showTomorrow ? futureData.rate : undefined, 
            effectiveDate: showTomorrow ? futureData.date : undefined 
        };
    });
}

export async function findRateAsync(from: string, to: string, db: Firestore): Promise<number | undefined> {
    await preFetchInitialRates(db);
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date, db: Firestore): Promise<HistoricalRateResult | undefined> {
    try {
        await preFetchInitialRates(db);
        const targetDateStr = format(date, 'yyyy-MM-dd');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        
        if (targetDateStr >= todayStr) {
            const data = findRateWithDate(from, to, targetDateStr > todayStr);
            if (data.rate !== undefined) return { rate: data.rate, date, isFallback: false };
        }

        const dbData = await loadHistoryRange(date, date, db);
        let dayData: MultiSourceData = dbData[targetDateStr] || {};

        const getPriceFromData = (currency: string, data: MultiSourceData) => {
            if (currency === 'USD') return 1;
            const sources: DataSource[] = ['nbrb', 'cbr', 'nbk', 'ecb', 'coingecko' as any, 'worldcurrencyapi'];
            for (const s of sources) if (data[currency]?.[s]) return data[currency][s].v;
            return undefined;
        };

        let fromPrice = getPriceFromData(from, dayData);
        let toPrice = getPriceFromData(to, dayData);

        if (fromPrice === undefined || toPrice === undefined) {
            const currenciesToFetch = [];
            if (fromPrice === undefined && from !== 'USD') currenciesToFetch.push(from);
            if (toPrice === undefined && to !== 'USD') currenciesToFetch.push(to);

            let dataChanged = false;
            for (const code of currenciesToFetch) {
                const isCrypto = cryptoMapping[code] !== undefined;
                let fetchedVal: number | undefined;
                let sourceId: string = 'unknown';

                try {
                    if (isCrypto) {
                        const id = cryptoMapping[code];
                        const cgDate = format(date, 'dd-MM-yyyy'); 
                        const res = await fetch(`/api/coingecko?endpoint=coins/${id}/history&date=${cgDate}`, { cache: 'no-store' });
                        if (res.ok) {
                            const data = await res.json();
                            fetchedVal = data?.market_data?.current_price?.usd;
                            sourceId = 'coingecko';
                        }
                    } else if (activeDataSource === 'nbrb' || activeDataSource === 'cbr') {
                        const liveData = await fetchSourceHistorical(date, activeDataSource);
                        if (liveData && liveData[code]) {
                            fetchedVal = liveData[code].v;
                            sourceId = activeDataSource;
                        }
                    }
                } catch (apiErr) {}

                if (fetchedVal !== undefined) {
                    if (!dayData[code]) dayData[code] = {};
                    dayData[code][sourceId] = { v: fetchedVal, d: targetDateStr, off: !isCrypto };
                    dataChanged = true;
                }
            }

            if (dataChanged) {
                setDoc(doc(db, 'rates_history', targetDateStr), {
                    timestamp: Timestamp.fromDate(startOfDay(date)),
                    base: 'USD',
                    data: dayData
                }, { merge: true }).catch(() => {});
            }

            fromPrice = getPriceFromData(from, dayData);
            toPrice = getPriceFromData(to, dayData);
        }

        if (fromPrice !== undefined && toPrice !== undefined) {
            return { rate: fromPrice / toPrice, date, isFallback: false };
        }
    } catch (globalErr) {}
    
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date, db: Firestore): Promise<{ date: string; rate: number }[]> {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const results = await Promise.all(days.map(async (d) => {
        try {
            const res = await getHistoricalRate(from, to, d, db);
            return res ? { date: format(d, 'dd.MM'), rate: res.rate } : null;
        } catch (e) {
            return null;
        }
    }));
    return results.filter((r): r is { date: string; rate: number } => r !== null);
}

async function loadHistoryRange(from: Date, to: Date, db: Firestore): Promise<Record<string, MultiSourceData>> {
    const results: Record<string, MultiSourceData> = {};
    try {
        const q = query(
            collection(db, 'rates_history'),
            where('timestamp', '>=', Timestamp.fromDate(startOfDay(from))),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay(to)))
        );
        const snap = await getDocs(q);
        snap.docs.forEach(doc => {
            const d = doc.data();
            const dateKey = format(d.timestamp.toDate(), 'yyyy-MM-dd');
            results[dateKey] = d.data;
        });
    } catch (e) {}
    return results;
}

async function fetchSourceHistorical(date: Date, source: DataSource): Promise<Record<string, { v: number, d: string, off: boolean }> | null> {
    const dateStr = format(date, 'yyyy-MM-dd');
    const cacheKey = `hist-${dateStr}-${source}`;
    if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

    const rates = await (source === 'nbrb' 
        ? (async (d: Date) => { 
            const dStr = format(d, 'yyyy-MM-dd');
            const res = await fetch(`https://api.nbrb.by/exrates/rates?ondate=${dStr}&periodicity=0`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            if (!Array.isArray(data) || data.length === 0) return null;
            const r: Record<string, number> = { 'BYN': 1 };
            data.forEach((item: any) => { r[item.Cur_Abbreviation] = item.Cur_OfficialRate / item.Cur_Scale; });
            const usd = r['USD'];
            if (!usd) return null;
            const norm: Record<string, number> = {};
            Object.keys(r).forEach(c => { norm[c] = r[c] / usd; });
            return norm;
          })(date)
        : (async (d: Date) => {
            const dateStrCbr = format(d, 'dd/MM/yyyy');
            const res = await fetch(`/api/cbr/history?date_req=${dateStrCbr}`, { cache: 'no-store' });
            if (!res.ok) return null;
            const data = await res.json();
            if (data?.ValCurs?.Valute) {
                const rates: Record<string, number> = {};
                const valutes = Array.isArray(data.ValCurs.Valute) ? data.ValCurs.Valute : [data.ValCurs.Valute];
                const usd = valutes.find((v: any) => v.CharCode[0] === 'USD');
                if (usd) {
                    const rubPerUsd = parseFloat(usd.Value[0].replace(',', '.'));
                    rates['RUB'] = 1 / rubPerUsd;
                    valutes.forEach((v: any) => {
                        const code = v.CharCode[0];
                        const val = parseFloat(v.Value[0].replace(',', '.'));
                        const nom = parseInt(v.Nominal[0]);
                        rates[code] = (val / nom) / rubPerUsd;
                    });
                    return rates;
                }
            }
            return null;
        })(date));

    if (rates) {
        const result: Record<string, { v: number, d: string, off: boolean }> = {};
        Object.keys(rates).forEach(c => { result[c] = { v: rates[c], d: dateStr, off: true }; });
        sessionCache.set(cacheKey, result);
        return result;
    }
    return null;
}
