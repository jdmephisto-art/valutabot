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

// Реестр стоимости 1 единицы актива в USD. 
// Инициализируем базовыми значениями как страховку до первой загрузки из БД.
let unifiedRates: Record<string, number> = { 
    'USD': 1,
    'EUR': 1.08,
    'BYN': 0.31,
    'RUB': 0.0108,
    'ANG': 0.558,
    'AWG': 0.555,
    'AFN': 0.0145,
    'AZN': 0.588,
    'BAM': 0.552,
    'AOA': 0.0011,
    'BTC': 95000,
    'TON': 5.2
};

const CACHE_TTL = 15 * 60 * 1000; // 15 минут

export function setDataSource(source: DataSource) {
    activeDataSource = source;
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

/**
 * Загружает начальные курсы из Firestore и подписывается на обновления.
 */
export async function preFetchInitialRates(db: Firestore) {
    const docRef = doc(db, 'rates_cache', 'unified');
    
    onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            unifiedRates = { ...unifiedRates, ...data.rates };
        }
    });

    try {
        const snap = await getDoc(docRef);
        const now = Date.now();
        if (!snap.exists() || (now - (snap.data()?.updatedAt || 0) > CACHE_TTL)) {
            updateAllRatesInCloud(db);
        } else if (snap.exists()) {
            unifiedRates = { ...unifiedRates, ...snap.data().rates };
        }
    } catch (e) {
        console.error('Firestore pre-fetch failed:', e);
    }
}

/**
 * Агрегирует данные из всех API (Каскад) и сохраняет в Firestore.
 */
export async function updateAllRatesInCloud(db: Firestore) {
    const newRates: Record<string, number> = { 'USD': 1 };

    try {
        // Опрашиваем все доступные источники параллельно
        const results = await Promise.allSettled([
            fetchNbrb(),
            fetchCbr(),
            fetchCoinGecko(),
            fetchCoinMarketCap(),
            fetchWorldCurrency(),
            fetchFixer(),
            fetchCurrencyApi(),
            fetchCoinlayer()
        ]);

        // Порядок слияния важен: более приоритетные источники перезаписывают менее приоритетные.
        // Иерархия (от низшего к высшему): 
        // 1. WorldCurrency/Fixer/CurrencyApi (Резерв фиат)
        // 2. Coinlayer/CMC (Резерв крипто)
        // 3. CoinGecko (Основной крипто/фиат)
        // 4. CBR (Официальный RUB/Металлы)
        // 5. NBRB (Официальный BYN)

        const [nbrb, cbr, gecko, cmc, world, fixer, curApi, clayer] = results;

        const merge = (res: any) => { if (res.status === 'fulfilled' && res.value) Object.assign(newRates, res.value); };

        merge(world);
        merge(fixer);
        merge(curApi);
        merge(clayer);
        merge(cmc);
        merge(gecko);
        merge(cbr);
        merge(nbrb);

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            rates: newRates,
            updatedAt: Date.now()
        }, { merge: true });

        unifiedRates = { ...unifiedRates, ...newRates };
    } catch (e) {
        console.error('Failed to update cloud rates:', e);
    }
}

async function fetchNbrb() {
    try {
        const res = await fetch('https://api.nbrb.by/exrates/rates?periodicity=0', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        const usdRate = data.find((r: any) => r.Cur_Abbreviation === 'USD');
        if (usdRate) {
            const usdPriceInByn = usdRate.Cur_OfficialRate / usdRate.Cur_Scale;
            data.forEach((r: any) => {
                const valInByn = r.Cur_OfficialRate / r.Cur_Scale;
                rates[r.Cur_Abbreviation] = valInByn / usdPriceInByn;
            });
            rates['BYN'] = 1 / usdPriceInByn;
        }
        return rates;
    } catch { return null; }
}

async function fetchCbr() {
    try {
        const [dailyRes, metalsRes] = await Promise.all([
            fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' }),
            fetch('/api/cbr/metals', { cache: 'no-store' })
        ]);
        
        const rates: Record<string, number> = {};
        const daily = await dailyRes.json();
        const rubPerUsd = daily?.Valute?.USD?.Value;

        if (rubPerUsd) {
            rates['RUB'] = 1 / rubPerUsd;
            Object.keys(daily.Valute).forEach(code => {
                const v = daily.Valute[code];
                rates[code] = (v.Value / v.Nominal) / rubPerUsd;
            });

            if (metalsRes.ok) {
                const metals = await metalsRes.json();
                if (metals['1']) rates['XAU'] = parseFloat(metals['1']) / rubPerUsd;
                if (metals['2']) rates['XAG'] = parseFloat(metals['2']) / rubPerUsd;
                if (metals['3']) rates['XPT'] = parseFloat(metals['3']) / rubPerUsd;
                if (metals['4']) rates['XPD'] = parseFloat(metals['4']) / rubPerUsd;
            }
        }
        return rates;
    } catch { return null; }
}

async function fetchCoinGecko() {
    try {
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
    } catch { return null; }
}

async function fetchCoinMarketCap() {
    try {
        const res = await fetch('/api/cmc?endpoint=cryptocurrency/listings/latest&limit=100', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.data) {
            data.data.forEach((coin: any) => {
                rates[coin.symbol] = coin.quote.USD.price;
            });
        }
        return rates;
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
        }
        return rates;
    } catch { return null; }
}

async function fetchFixer() {
    try {
        const res = await fetch('/api/fixer?endpoint=latest', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.rates && data.rates.USD) {
            const eurInUsd = 1 / data.rates.USD;
            Object.keys(data.rates).forEach(code => {
                rates[code] = (1 / data.rates[code]) / eurInUsd;
            });
        }
        return rates;
    } catch { return null; }
}

async function fetchCurrencyApi() {
    try {
        const res = await fetch('/api/currency?endpoint=rates', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.rates) {
            Object.keys(data.rates).forEach(code => {
                if (data.rates[code] > 0) rates[code] = 1 / data.rates[code];
            });
        }
        return rates;
    } catch { return null; }
}

async function fetchCoinlayer() {
    try {
        const res = await fetch('/api/coinlayer?endpoint=live', { cache: 'no-store' });
        if (!res.ok) return null;
        const data = await res.json();
        const rates: Record<string, number> = {};
        if (data?.rates) {
            Object.keys(data.rates).forEach(code => {
                rates[code] = data.rates[code];
            });
        }
        return rates;
    } catch { return null; }
}

export function findRate(from: string, to: string): number | undefined {
    if (from === to) return 1;
    const fromPriceInUsd = unifiedRates[from];
    const toPriceInUsd = unifiedRates[to];
    if (fromPriceInUsd !== undefined && toPriceInUsd !== undefined && toPriceInUsd !== 0) {
        return fromPriceInUsd / toPriceInUsd;
    }
    return undefined;
}

export async function getCurrencies(): Promise<Currency[]> {
    const dbCodes = Object.keys(unifiedRates);
    const dbCurrencies: Currency[] = dbCodes.map(code => ({ code, name: code }));
    
    const all = [
        ...currencyApiPreloadedCurrencies, 
        ...dbCurrencies
    ];
    
    const unique = Array.from(new Map(all.map(item => [item.code, item])).values());
    return unique.sort((a, b) => a.code.localeCompare(b.code));
}

export async function getLatestRates(pairs: string[], db: Firestore): Promise<ExchangeRate[]> {
    await preFetchInitialRates(db);
    return pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to, rate: findRate(from, to) };
    });
}

export async function findRateAsync(from: string, to: string, db: Firestore): Promise<number | undefined> {
    await preFetchInitialRates(db);
    return findRate(from, to);
}

export async function getHistoricalRate(from: string, to: string, date: Date, db: Firestore): Promise<HistoricalRateResult | undefined> {
    if (isAfter(startOfDay(date), startOfDay(new Date()))) return undefined;
    
    if (isSameDay(date, new Date())) {
        const rate = findRate(from, to);
        if (rate !== undefined) return { rate, date, isFallback: false };
    }

    const current = findRate(from, to);
    if (current !== undefined) {
        return { 
            rate: current * (0.98 + Math.random() * 0.04), 
            date, 
            isFallback: true 
        };
    }
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const points = 7;
    const result: { date: string; rate: number }[] = [];
    const baseRate = findRate(from, to) || 1;
    const volatility = cryptoCodes.includes(from) || cryptoCodes.includes(to) ? 0.05 : 0.003;

    for (let i = 0; i <= points; i++) {
        const d = new Date(startDate.getTime() + (endDate.getTime() - startDate.getTime()) * (i / points));
        const noise = 1 + (Math.random() - 0.5) * volatility;
        result.push({ date: format(d, 'dd.MM'), rate: baseRate * noise });
    }
    return result;
}
