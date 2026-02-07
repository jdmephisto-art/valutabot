
import { Currency, ExchangeRate, DataSource, HistoricalRateResult } from '@/lib/types';
import { format, subDays, differenceInDays, addDays, isFuture, getUnixTime } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, Firestore } from 'firebase/firestore';

let activeDataSource: DataSource = 'nbrb';

export const cryptoCodes = [
    'BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'BTG', 'DASH', 'EOS', 
    'SOL', 'TON', 'DOGE', 'ADA', 'DOT', 'TRX', 'MATIC', 'AVAX', 'LINK',
    'USDT', 'USDC', 'DAI', 'NOT', 'DOGS',
    'FET', 'RNDR', 'AGIX', 'UNI', 'AAVE', 'MKR', 'SAND', 'MANA', 'AXS', 'IMX',
    'SHIB', 'PEPE', 'FLOKI', 'BONK', 'FIL', 'AR', 'STORJ', 'HNT', 'THETA',
    'ONDO', 'BNB', 'OKB', 'CRO', 'NEAR', 'ATOM', 'ARB', 'OP',
    'XAU', 'XAG', 'XPT', 'XPD',
    'BAYC', 'AZUKI', 'PUDGY'
];

const metalCodes = ['XAU', 'XAG', 'XPT', 'XPD'];
const metalMap: Record<string, string> = { 'XAU': '1', 'XAG': '2', 'XPT': '3', 'XPD': '4' };

const cryptoMapping: Record<string, string> = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'LTC': 'litecoin', 'XRP': 'ripple',
    'BCH': 'bitcoin-cash', 'DASH': 'dash', 'SOL': 'solana', 'TON': 'the-open-network',
    'DOGE': 'dogecoin', 'ADA': 'cardano', 'DOT': 'polkadot', 'TRX': 'tron',
    'MATIC': 'matic-network', 'AVAX': 'avalanche-2', 'LINK': 'chainlink',
    'USDT': 'tether', 'USDC': 'usd-coin', 'DAI': 'dai', 'NOT': 'notcoin',
    'DOGS': 'dogs', 'FET': 'fetch-ai', 'RNDR': 'render-token', 'AGIX': 'singularitynet',
    'UNI': 'uniswap', 'AAVE': 'aave', 'MKR': 'maker', 'SAND': 'the-sandbox',
    'MANA': 'decentraland', 'AXS': 'axie-infinity', 'IMX': 'immutable-x',
    'SHIB': 'shiba-inu', 'PEPE': 'pepe', 'FLOKI': 'floki', 'BONK': 'bonk',
    'FIL': 'filecoin', 'AR': 'arweave', 'STORJ': 'storj', 'HNT': 'helium',
    'THETA': 'theta-token', 'ONDO': 'ondo-finance', 'BNB': 'binancecoin',
    'OKB': 'okb', 'CRO': 'crypto-com-chain', 'NEAR': 'near', 'ATOM': 'cosmos',
    'ARB': 'arbitrum', 'OP': 'optimism'
};

const nftsMapping: Record<string, string> = {
    'BAYC': 'bored-ape-yacht-club', 'AZUKI': 'azuki', 'PUDGY': 'pudgy-penguins'
};

const CACHE_TTL_RATES = 15 * 60 * 1000;

// Local ephemeral cache
let nbrbRatesCache: any = {};
let nbrbRatesTimestamp = 0;
let worldCurrencyRatesCache: any = {};
let worldCurrencyRatesTimestamp = 0;
let fixerRatesCache: any = {};
let fixerRatesTimestamp = 0;
let cbrRatesCache: any = null;
let cbrRatesTimestamp = 0;
let cbrMetalsCache: Record<string, number> = {};
let cbrMetalsTimestamp = 0;
let cryptoRatesCache: Record<string, number> = {};
let cryptoRatesTimestamp = 0;
let nftRatesCache: Record<string, number> = {};
let nftRatesTimestamp = 0;

const historicalCache = new Map<string, number>();

export function setDataSource(source: DataSource) {
    if (source !== activeDataSource) {
        activeDataSource = source;
    }
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

// Firestore Cache Logic
async function getCacheFromFirestore(db: Firestore, source: string) {
    const docRef = doc(db, 'rates_cache', source);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        if (Date.now() - data.updatedAt < CACHE_TTL_RATES) {
            return data.rates;
        }
    }
    return null;
}

function saveCacheToFirestore(db: Firestore, source: string, rates: any) {
    const docRef = doc(db, 'rates_cache', source);
    setDoc(docRef, {
        source,
        rates,
        updatedAt: Date.now()
    }, { merge: true });
}

async function coingeckoApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/coingecko?${queryParams.toString()}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

async function worldCurrencyApiFetch(endpoint: string, params: Record<string, string> = {}) {
    const queryParams = new URLSearchParams({ endpoint, ...params });
    const url = `/api/worldcurrency?${queryParams.toString()}`;
    try {
        const response = await fetch(url, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

export async function _updateCryptoRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - cryptoRatesTimestamp < CACHE_TTL_RATES && Object.keys(cryptoRatesCache).length > 0) return;
    
    if (db) {
        const cached = await getCacheFromFirestore(db, 'crypto');
        if (cached) {
            cryptoRatesCache = cached;
            cryptoRatesTimestamp = Date.now();
            return;
        }
    }

    try {
        const ids = Object.values(cryptoMapping).join(',');
        const data = await coingeckoApiFetch('simple/price', { ids, vs_currencies: 'usd' });
        if (data) {
            const temp: any = {};
            Object.keys(cryptoMapping).forEach(code => {
                const id = cryptoMapping[code];
                if (data[id]?.usd) temp[code] = data[id].usd;
            });
            cryptoRatesCache = { ...cryptoRatesCache, ...temp };
            cryptoRatesTimestamp = Date.now();
            if (db) saveCacheToFirestore(db, 'crypto', cryptoRatesCache);
        }
    } catch (e) { console.error('Crypto update failed', e); }
}

export async function _updateNbrbRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - nbrbRatesTimestamp < CACHE_TTL_RATES && Object.keys(nbrbRatesCache).length > 0) return;
    
    if (db) {
        const cached = await getCacheFromFirestore(db, 'nbrb');
        if (cached) {
            nbrbRatesCache = cached;
            nbrbRatesTimestamp = Date.now();
            return;
        }
    }

    try {
        const data = await nbrbApiFetch('rates?periodicity=0');
        if (data && Array.isArray(data)) {
            const temp: any = {};
            data.forEach((r: any) => {
                if (r.Cur_Abbreviation) temp[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale };
            });
            nbrbRatesCache = temp;
            nbrbRatesTimestamp = Date.now();
            if (db) saveCacheToFirestore(db, 'nbrb', nbrbRatesCache);
        }
    } catch (e) { console.error('NBRB update failed', e); }
}

export async function _updateWorldCurrencyRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - worldCurrencyRatesTimestamp < CACHE_TTL_RATES && Object.keys(worldCurrencyRatesCache).length > 0) return;
    
    if (db) {
        const cached = await getCacheFromFirestore(db, 'worldcurrencyapi');
        if (cached) {
            worldCurrencyRatesCache = cached;
            worldCurrencyRatesTimestamp = Date.now();
            return;
        }
    }

    try {
        const data = await worldCurrencyApiFetch('rates', { base: 'USD' });
        if (data?.rates) {
            worldCurrencyRatesCache = data.rates;
            worldCurrencyRatesCache['USD'] = 1;
            worldCurrencyRatesTimestamp = Date.now();
            if (db) saveCacheToFirestore(db, 'worldcurrencyapi', worldCurrencyRatesCache);
        }
    } catch (e) { console.error('WorldCurrency update failed', e); }
}

function getRateVsUsd(code: string): number | undefined {
    if (code === 'USD') return 1;
    if (cryptoRatesCache[code]) return cryptoRatesCache[code];
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        return (nbrbRatesCache[code].rate / nbrbRatesCache[code].scale) / (nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale);
    }
    if (worldCurrencyRatesCache[code]) return 1 / worldCurrencyRatesCache[code];
    return undefined;
}

export function findRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    const fromUsd = getRateVsUsd(from);
    const toUsd = getRateVsUsd(to);
    if (fromUsd !== undefined && toUsd !== undefined && toUsd !== 0) return fromUsd / toUsd;
    return undefined;
}

export async function getCurrencies(): Promise<Currency[]> {
    return currencyApiPreloadedCurrencies.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db?: Firestore): Promise<ExchangeRate[]> {
    await preFetchInitialRates(db);
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to, rate: findRate(from, to) };
    });
}

export async function findRateAsync(from: string, to: string, db?: Firestore): Promise<number | undefined> {
    await preFetchInitialRates(db);
    return findRate(from, to);
}

export async function preFetchInitialRates(db?: Firestore) {
    const ds = getDataSource();
    const tasks = [_updateCryptoRatesCache(db)];
    if (ds === 'nbrb') tasks.push(_updateNbrbRatesCache(db));
    if (ds === 'worldcurrencyapi') tasks.push(_updateWorldCurrencyRatesCache(db));
    await Promise.allSettled(tasks);
}

export async function getHistoricalRate(from: string, to: string, date: Date, allowLookBack = true): Promise<HistoricalRateResult | undefined> {
    // Basic implementation for now, prioritizing speed
    const live = findRate(from, to);
    if (live !== undefined) return { rate: live, date };
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    return []; // Placeholder for optimization
}
