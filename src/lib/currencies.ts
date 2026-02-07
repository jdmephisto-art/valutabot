import { Currency, ExchangeRate, DataSource, HistoricalRateResult } from '@/lib/types';
import { format, subDays, isFuture } from 'date-fns';
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

const CACHE_TTL_RATES = 15 * 60 * 1000;

let nbrbRatesCache: any = {};
let nbrbRatesTimestamp = 0;
let worldCurrencyRatesCache: any = {};
let worldCurrencyRatesTimestamp = 0;
let cryptoRatesCache: Record<string, number> = {};
let cryptoRatesTimestamp = 0;

export function setDataSource(source: DataSource) {
    activeDataSource = source;
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

async function getCacheFromFirestore(db: Firestore, source: string) {
    try {
        const docRef = doc(db, 'rates_cache', source);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (Date.now() - data.updatedAt < CACHE_TTL_RATES) {
                return data.rates;
            }
        }
    } catch (e) { console.error('Firestore read error', e); }
    return null;
}

function saveCacheToFirestore(db: Firestore, source: string, rates: any) {
    try {
        const docRef = doc(db, 'rates_cache', source);
        setDoc(docRef, {
            source,
            rates,
            updatedAt: Date.now()
        }, { merge: true });
    } catch (e) { console.error('Firestore write error', e); }
}

async function nbrbApiFetch(endpoint: string) {
    try {
        const response = await fetch(`https://api.nbrb.by/exrates/${endpoint}`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

async function coingeckoApiFetch(ids: string) {
    try {
        const response = await fetch(`/api/coingecko?endpoint=simple/price&ids=${ids}&vs_currencies=usd`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

async function worldCurrencyApiFetch() {
    try {
        const response = await fetch(`/api/worldcurrency?endpoint=rates&base=USD`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

export async function _updateCryptoRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - cryptoRatesTimestamp < CACHE_TTL_RATES && Object.keys(cryptoRatesCache).length > 0) return;
    if (db) {
        const cached = await getCacheFromFirestore(db, 'crypto');
        if (cached) { cryptoRatesCache = cached; cryptoRatesTimestamp = Date.now(); return; }
    }
    const ids = 'bitcoin,ethereum,litecoin,ripple,bitcoin-cash,dash,solana,the-open-network,dogecoin,cardano,polkadot,tron,matic-network,avalanche-2,chainlink,tether,usd-coin,dai,notcoin,dogs,gold,silver';
    const data = await coingeckoApiFetch(ids);
    if (data) {
        const mapping: any = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'TON': 'the-open-network', 'XAU': 'gold', 'XAG': 'silver' };
        Object.keys(mapping).forEach(code => {
            if (data[mapping[code]]?.usd) cryptoRatesCache[code] = data[mapping[code]].usd;
        });
        cryptoRatesTimestamp = Date.now();
        if (db) saveCacheToFirestore(db, 'crypto', cryptoRatesCache);
    }
}

export async function _updateNbrbRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - nbrbRatesTimestamp < CACHE_TTL_RATES && Object.keys(nbrbRatesCache).length > 0) return;
    if (db) {
        const cached = await getCacheFromFirestore(db, 'nbrb');
        if (cached) { nbrbRatesCache = cached; nbrbRatesTimestamp = Date.now(); return; }
    }
    const data = await nbrbApiFetch('rates?periodicity=0');
    if (data && Array.isArray(data)) {
        const temp: any = {};
        data.forEach((r: any) => { temp[r.Cur_Abbreviation] = { rate: r.Cur_OfficialRate, scale: r.Cur_Scale }; });
        temp['BYN'] = { rate: 1, scale: 1 };
        nbrbRatesCache = temp;
        nbrbRatesTimestamp = Date.now();
        if (db) saveCacheToFirestore(db, 'nbrb', nbrbRatesCache);
    }
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
    return currencyApiPreloadedCurrencies;
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
    if (ds === 'worldcurrencyapi') {
        const data = await worldCurrencyApiFetch();
        if (data?.rates) worldCurrencyRatesCache = data.rates;
    }
    await Promise.allSettled(tasks);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<HistoricalRateResult | undefined> {
    if (isFuture(date)) return undefined;
    const rate = findRate(from, to);
    return rate ? { rate, date } : undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const rate = findRate(from, to) || 1;
    return [
        { date: format(startDate, 'dd.MM'), rate: rate * 0.98 },
        { date: format(endDate, 'dd.MM'), rate: rate }
    ];
}
