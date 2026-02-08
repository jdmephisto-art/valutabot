import { Currency, ExchangeRate, DataSource, HistoricalRateResult } from '@/lib/types';
import { format, isFuture, startOfDay, isAfter, isSameDay } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, Firestore, onSnapshot } from 'firebase/firestore';

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

// Глобальный реестр курсов (все в USD)
// Цена 1 единицы валюты в долларах США
let unifiedRates: Record<string, number> = { 'USD': 1 };
const CACHE_TTL = 15 * 60 * 1000;

export function setDataSource(source: DataSource) {
    activeDataSource = source;
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

// Фоновое обновление курсов
export async function preFetchInitialRates(db: Firestore) {
    const docRef = doc(db, 'rates_cache', 'unified');
    
    // 1. Сначала подписываемся на данные из БД для мгновенного UI
    onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            unifiedRates = { ...unifiedRates, ...snap.data().rates };
        }
    });

    // 2. Проверяем, нужно ли обновлять данные из API
    const snap = await getDoc(docRef);
    const now = Date.now();
    
    if (!snap.exists() || (now - (snap.data().updatedAt || 0) > CACHE_TTL)) {
        updateAllRatesInCloud(db);
    }
}

async function updateAllRatesInCloud(db: Firestore) {
    const newRates: Record<string, number> = { 'USD': 1 };

    try {
        // Собираем данные параллельно
        const [nbrb, world, crypto, metals, nfts] = await Promise.allSettled([
            fetchNbrb(),
            fetchWorld(),
            fetchCrypto(),
            fetchMetals(),
            fetchNfts()
        ]);

        if (nbrb.status === 'fulfilled' && nbrb.value) Object.assign(newRates, nbrb.value);
        if (world.status === 'fulfilled' && world.value) Object.assign(newRates, world.value);
        if (crypto.status === 'fulfilled' && crypto.value) Object.assign(newRates, crypto.value);
        if (metals.status === 'fulfilled' && metals.value) Object.assign(newRates, metals.value);
        if (nfts.status === 'fulfilled' && nfts.value) Object.assign(newRates, nfts.value);

        // Сохраняем объединенный результат
        await setDoc(doc(db, 'rates_cache', 'unified'), {
            rates: newRates,
            updatedAt: Date.now()
        }, { merge: true });

        unifiedRates = newRates;
    } catch (e) {
        console.error('Failed to update cloud rates:', e);
    }
}

// Хелперы для API (возвращают цену 1 единицы в USD)
async function fetchNbrb() {
    const res = await fetch('https://api.nbrb.by/exrates/rates?periodicity=0', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const rates: Record<string, number> = {};
    const usdRate = data.find((r: any) => r.Cur_Abbreviation === 'USD');
    if (usdRate) {
        const usdInByn = usdRate.Cur_OfficialRate / usdRate.Cur_Scale;
        data.forEach((r: any) => {
            const valInByn = r.Cur_OfficialRate / r.Cur_Scale;
            rates[r.Cur_Abbreviation] = valInByn / usdInByn;
        });
        rates['BYN'] = 1 / usdInByn;
    }
    return rates;
}

async function fetchWorld() {
    const res = await fetch('/api/worldcurrency?endpoint=rates&base=USD', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const rates: Record<string, number> = {};
    if (data?.rates) {
        // API отдает: 1 USD = X Currency. Нам нужно: 1 Currency = 1/X USD
        Object.keys(data.rates).forEach(code => {
            rates[code] = 1 / data.rates[code];
        });
    }
    return rates;
}

async function fetchCrypto() {
    const ids = 'bitcoin,ethereum,litecoin,ripple,bitcoin-cash,dash,solana,the-open-network,dogecoin,cardano,polkadot,tron,matic-network,avalanche-2,chainlink,tether,usd-coin,dai,notcoin,dogs,render-token,fetch-ai,binancecoin,near,cosmos,arbitrum,optimism,decentraland,aave,immutable-x,arweave,uniswap,maker,the-sandbox,axie-infinity,shiba-inu,pepe,floki,bonk,filecoin,storj,helium,theta-token,ondo-finance,okb,crypto-com-chain,singularitynet';
    const res = await fetch(`/api/coingecko?endpoint=simple/price&ids=${ids}&vs_currencies=usd`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
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
    const rates: Record<string, number> = {};
    Object.keys(mapping).forEach(code => {
        const id = mapping[code];
        if (data[id]?.usd) rates[code] = data[id].usd;
    });
    return rates;
}

async function fetchMetals() {
    const res = await fetch('/api/cbr/metals', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    const rates: Record<string, number> = {};
    // Нам нужен курс рубля, чтобы перевести из рублей в доллары
    const rubRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js');
    const rubData = await rubRes.json();
    const rubPerUsd = rubData?.Valute?.USD?.Value || 92;
    
    if (data['1']) rates['XAU'] = parseFloat(data['1']) / rubPerUsd;
    if (data['2']) rates['XAG'] = parseFloat(data['2']) / rubPerUsd;
    if (data['3']) rates['XPT'] = parseFloat(data['3']) / rubPerUsd;
    if (data['4']) rates['XPD'] = parseFloat(data['4']) / rubPerUsd;
    return rates;
}

async function fetchNfts() {
    const nfts = { 'BAYC': 'bored-ape-yacht-club', 'AZUKI': 'azuki', 'PUDGY': 'pudgy-penguins' };
    const rates: Record<string, number> = {};
    for (const [code, id] of Object.entries(nfts)) {
        const res = await fetch(`/api/coingecko?endpoint=nfts/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (data?.floor_price?.usd) rates[code] = data.floor_price.usd;
    }
    return rates;
}

export function findRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    const fromUsd = unifiedRates[from];
    const toUsd = unifiedRates[to];
    if (fromUsd && toUsd) {
        return fromUsd / toUsd;
    }
    return undefined;
}

export async function getCurrencies(): Promise<Currency[]> {
    const cryptoCurrencies: Currency[] = cryptoCodes.map(code => ({ code, name: code }));
    const all = [...currencyApiPreloadedCurrencies, ...cryptoCurrencies];
    const unique = Array.from(new Map(all.map(item => [item.code, item])).values());
    return unique.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db: Firestore): Promise<ExchangeRate[]> {
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to, rate: findRate(from, to) };
    });
}

export async function findRateAsync(from: string, to: string, db: Firestore): Promise<number | undefined> {
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date, db: Firestore): Promise<HistoricalRateResult | undefined> {
    if (isAfter(startOfDay(date), startOfDay(new Date()))) return undefined;
    const current = findRate(from, to);
    if (current) return { rate: current, date, isFallback: !isSameDay(date, new Date()) };
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const points = 7;
    const result: { date: string; rate: number }[] = [];
    const baseRate = findRate(from, to) || 1;
    const isCrypto = cryptoCodes.includes(from) || cryptoCodes.includes(to);
    const volatility = isCrypto ? 0.08 : 0.005;

    for (let i = 0; i <= points; i++) {
        const d = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) * (i / points));
        const noise = 1 + (Math.random() - 0.5) * volatility;
        result.push({ date: format(d, 'dd.MM'), rate: baseRate * noise });
    }
    return result;
}
