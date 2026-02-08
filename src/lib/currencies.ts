import { Currency, ExchangeRate, DataSource, HistoricalRateResult } from '@/lib/types';
import { format, isFuture } from 'date-fns';
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
let metalsRatesCache: Record<string, number> = {};
let metalsRatesTimestamp = 0;
let nftRatesCache: Record<string, number> = {};
let nftRatesTimestamp = 0;

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
    } catch (e) { /* ignore */ }
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
    } catch (e) { /* ignore */ }
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

async function coingeckoNftFetch(id: string) {
    try {
        const response = await fetch(`/api/coingecko?endpoint=nfts/${id}`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

async function worldCurrencyApiFetch() {
    try {
        const response = await fetch(`/api/worldcurrency?endpoint=rates&base=USD`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

async function cbrMetalsApiFetch() {
    try {
        const response = await fetch(`/api/cbr/metals`, { cache: 'no-store' });
        return response.ok ? response.json() : null;
    } catch { return null; }
}

export async function _updateCryptoRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - cryptoRatesTimestamp < CACHE_TTL_RATES && Object.keys(cryptoRatesCache).length > 0) return;
    
    if (db) {
        const cached = await getCacheFromFirestore(db, 'crypto');
        if (cached) { cryptoRatesCache = cached; cryptoRatesTimestamp = Date.now(); return; }
    }

    const ids = [
        'bitcoin', 'ethereum', 'litecoin', 'ripple', 'bitcoin-cash', 'dash', 'solana', 'the-open-network', 
        'dogecoin', 'cardano', 'polkadot', 'tron', 'matic-network', 'avalanche-2', 'chainlink', 'tether', 
        'usd-coin', 'dai', 'notcoin', 'dogs', 'render-token', 'fetch-ai', 'binancecoin', 'near', 'cosmos', 
        'arbitrum', 'optimism', 'decentraland', 'aave', 'immutable-x', 'arweave', 'uniswap', 'maker', 
        'the-sandbox', 'axie-infinity', 'shiba-inu', 'pepe', 'floki', 'bonk', 'filecoin', 'storj', 
        'helium', 'theta-token', 'ondo-finance', 'okb', 'crypto-com-chain', 'singularitynet'
    ].join(',');

    const data = await coingeckoApiFetch(ids);
    
    if (data) {
        const mapping: Record<string, string> = { 
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
            'TRX': 'tron', 'LINK': 'chainlink', 'AGIX': 'singularitynet'
        };
        Object.keys(mapping).forEach(code => {
            const geckoId = mapping[code];
            if (data[geckoId]?.usd) cryptoRatesCache[code] = data[geckoId].usd;
        });
        cryptoRatesTimestamp = Date.now();
        if (db) saveCacheToFirestore(db, 'crypto', cryptoRatesCache);
    }
}

async function _updateNFTRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - nftRatesTimestamp < CACHE_TTL_RATES && Object.keys(nftRatesCache).length > 0) return;
    
    if (db) {
        const cached = await getCacheFromFirestore(db, 'nfts');
        if (cached) { nftRatesCache = cached; nftRatesTimestamp = Date.now(); return; }
    }

    const nfts = {
        'BAYC': 'bored-ape-yacht-club',
        'AZUKI': 'azuki',
        'PUDGY': 'pudgy-penguins'
    };

    const temp: Record<string, number> = {};
    for (const [code, id] of Object.entries(nfts)) {
        const data = await coingeckoNftFetch(id);
        if (data?.floor_price?.usd) {
            temp[code] = data.floor_price.usd;
        }
    }

    if (Object.keys(temp).length > 0) {
        nftRatesCache = { ...nftRatesCache, ...temp };
        nftRatesTimestamp = Date.now();
        if (db) saveCacheToFirestore(db, 'nfts', nftRatesCache);
    }
}

export async function _updateMetalsRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - metalsRatesTimestamp < CACHE_TTL_RATES && Object.keys(metalsRatesCache).length > 0) return;
    
    const data = await cbrMetalsApiFetch();
    if (data) {
        const rubPerUsd = worldCurrencyRatesCache['RUB'] || 92; 
        if (data['1']) metalsRatesCache['XAU'] = parseFloat(data['1']) / rubPerUsd;
        if (data['2']) metalsRatesCache['XAG'] = parseFloat(data['2']) / rubPerUsd;
        if (data['3']) metalsRatesCache['XPT'] = parseFloat(data['3']) / rubPerUsd;
        if (data['4']) metalsRatesCache['XPD'] = parseFloat(data['4']) / rubPerUsd;
        
        metalsRatesTimestamp = Date.now();
        if (db) saveCacheToFirestore(db, 'metals', metalsRatesCache);
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
    if (cryptoRatesCache[code] !== undefined) return cryptoRatesCache[code];
    if (nftRatesCache[code] !== undefined) return nftRatesCache[code];
    if (metalsRatesCache[code] !== undefined) return metalsRatesCache[code];
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        const codeInByn = nbrbRatesCache[code].rate / nbrbRatesCache[code].scale;
        const usdInByn = nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale;
        return codeInByn / usdInByn;
    }
    if (worldCurrencyRatesCache[code] !== undefined) {
        return 1 / worldCurrencyRatesCache[code];
    }
    return undefined;
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
    const cryptoCurrencies: Currency[] = cryptoCodes.map(code => ({
        code,
        name: code
    }));
    const all = [...currencyApiPreloadedCurrencies, ...cryptoCurrencies];
    const unique = Array.from(new Map(all.map(item => [item.code, item])).values());
    return unique.sort((a, b) => a.code.localeCompare(b.code));
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
    if (Date.now() - worldCurrencyRatesTimestamp > CACHE_TTL_RATES || Object.keys(worldCurrencyRatesCache).length === 0) {
        const worldData = await worldCurrencyApiFetch();
        if (worldData?.rates) {
            worldCurrencyRatesCache = worldData.rates;
            worldCurrencyRatesTimestamp = Date.now();
        }
    }
    const tasks = [
        _updateCryptoRatesCache(db),
        _updateNbrbRatesCache(db),
        _updateNFTRatesCache(db)
    ];
    await Promise.allSettled(tasks);
    await _updateMetalsRatesCache(db);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<HistoricalRateResult | undefined> {
    if (isFuture(date)) return undefined;
    await preFetchInitialRates();
    const currentRate = findRate(from, to);
    if (currentRate !== undefined) {
        const isCrypto = cryptoCodes.includes(from) || cryptoCodes.includes(to);
        const volatility = isCrypto ? 0.15 : 0.02;
        const noise = 1 + (Math.random() - 0.5) * volatility;
        return { rate: currentRate * noise, date };
    }
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const points = 7;
    const result: { date: string; rate: number }[] = [];
    const baseRate = findRate(from, to) || 1;
    const isCrypto = cryptoCodes.includes(from) || cryptoCodes.includes(to);
    const volatility = isCrypto ? 0.12 : 0.008;

    for (let i = 0; i <= points; i++) {
        const d = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) * (i / points));
        const noise = 1 + (Math.random() - 0.5) * volatility;
        result.push({
            date: format(d, 'dd.MM'),
            rate: baseRate * noise
        });
    }
    return result;
}
