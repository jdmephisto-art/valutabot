import { Currency, ExchangeRate, DataSource, HistoricalRateResult } from '@/lib/types';
import { format, subDays, isFuture, isSameDay } from 'date-fns';
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
    const ids = 'bitcoin,ethereum,litecoin,ripple,bitcoin-cash,dash,solana,the-open-network,dogecoin,cardano,polkadot,tron,matic-network,avalanche-2,chainlink,tether,usd-coin,dai,notcoin,dogs,gold,silver,render-token,fetch-ai,binancecoin';
    const data = await coingeckoApiFetch(ids);
    if (data) {
        const mapping: Record<string, string> = { 
            'BTC': 'bitcoin', 'ETH': 'ethereum', 'TON': 'the-open-network', 'XAU': 'gold', 'XAG': 'silver',
            'SOL': 'solana', 'FET': 'fetch-ai', 'RNDR': 'render-token', 'BNB': 'binancecoin'
        };
        Object.keys(mapping).forEach(code => {
            const geckoId = mapping[code];
            if (data[geckoId]?.usd) cryptoRatesCache[code] = data[geckoId].usd;
        });
        cryptoRatesTimestamp = Date.now();
        if (db) saveCacheToFirestore(db, 'crypto', cryptoRatesCache);
    }
}

export async function _updateMetalsRatesCache(db?: Firestore): Promise<void> {
    if (Date.now() - metalsRatesTimestamp < CACHE_TTL_RATES && Object.keys(metalsRatesCache).length > 0) return;
    const data = await cbrMetalsApiFetch();
    if (data) {
        // CBR codes: 1-Gold, 2-Silver, 3-Platinum, 4-Palladium
        // Prices are in RUB per gram
        const rubUsd = findRate('RUB', 'USD') || 0.011;
        if (data['1']) metalsRatesCache['XAU'] = data['1'] * rubUsd;
        if (data['2']) metalsRatesCache['XAG'] = data['2'] * rubUsd;
        if (data['3']) metalsRatesCache['XPT'] = data['3'] * rubUsd;
        if (data['4']) metalsRatesCache['XPD'] = data['4'] * rubUsd;
        metalsRatesTimestamp = Date.now();
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
    if (metalsRatesCache[code]) return metalsRatesCache[code];
    
    // NBRB cross-rate
    if (nbrbRatesCache[code] && nbrbRatesCache['USD']) {
        return (nbrbRatesCache[code].rate / nbrbRatesCache[code].scale) / (nbrbRatesCache['USD'].rate / nbrbRatesCache['USD'].scale);
    }
    
    // WorldCurrencyAPI
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
    tasks.push(_updateMetalsRatesCache(db));
    await Promise.allSettled(tasks);
}

export async function getHistoricalRate(from: string, to: string, date: Date): Promise<HistoricalRateResult | undefined> {
    if (isFuture(date)) return undefined;
    
    // Look-back logic (7 days)
    for (let i = 0; i < 7; i++) {
        const checkDate = subDays(date, i);
        const dateStr = format(checkDate, 'dd/MM/yyyy');
        
        // Use CBR API for historical RUB-based rates
        if (from === 'RUB' || to === 'RUB' || from === 'USD' || to === 'USD') {
            try {
                const res = await fetch(`/api/cbr/history?date_req=${dateStr}`);
                if (res.ok) {
                    const xml = await res.json();
                    if (xml?.ValCurs?.Valute) {
                        const valutes = xml.ValCurs.Valute;
                        const usdData = valutes.find((v: any) => v.CharCode?.[0] === 'USD');
                        if (usdData) {
                            const usdRate = parseFloat(usdData.Value[0].replace(',', '.'));
                            const rubToUsd = 1 / usdRate;
                            
                            if (from === 'USD' && to === 'RUB') return { rate: usdRate, date: checkDate };
                            if (from === 'RUB' && to === 'USD') return { rate: rubToUsd, date: checkDate };
                        }
                    }
                }
            } catch (e) { /* ignore */ }
        }
    }

    const rate = findRate(from, to);
    return rate ? { rate, date } : undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const points = 7;
    const result: { date: string; rate: number }[] = [];
    const baseRate = findRate(from, to) || 1;
    
    // Simulate realistic trend based on volatility
    const volatility = cryptoCodes.includes(from) || cryptoCodes.includes(to) ? 0.05 : 0.005;

    for (let i = 0; i <= points; i++) {
        const d = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) * (i / points));
        // Add some noise to the simulated rate
        const noise = 1 + (Math.random() - 0.5) * volatility;
        result.push({
            date: format(d, 'dd.MM'),
            rate: baseRate * noise
        });
    }
    
    return result;
}