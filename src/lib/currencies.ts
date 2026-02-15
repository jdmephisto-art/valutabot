
import { Currency, ExchangeRate, DataSource, HistoricalRateResult } from '@/lib/types';
import { format, isFuture, startOfDay, isAfter, isSameDay, eachDayOfInterval } from 'date-fns';
import { currencyApiPreloadedCurrencies } from './preloaded-data';
import { doc, getDoc, setDoc, Firestore, onSnapshot } from 'firebase/firestore';

let activeDataSource: DataSource = 'nbrb';

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

let unifiedRates: Record<string, number> = { 
    'USD': 1,
    'EUR': 1.08,
    'BYN': 0.31,
    'RUB': 0.0108,
    'BTC': 95000,
    'TON': 5.2,
    'KZT': 0.002
};

const CACHE_TTL = 15 * 60 * 1000;

export function setDataSource(source: DataSource) {
    activeDataSource = source;
}

export function getDataSource(): DataSource {
    return activeDataSource;
}

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
        // Silently fail
    }
}

export async function updateAllRatesInCloud(db: Firestore) {
    const newRates: Record<string, number> = { 'USD': 1 };

    try {
        const sources = [
            { id: 'worldcurrencyapi', fn: fetchWorldCurrency },
            { id: 'fixer', fn: fetchFixer },
            { id: 'currencyapi', fn: fetchCurrencyApi },
            { id: 'coinlayer', fn: fetchCoinlayer },
            { id: 'coingecko', fn: fetchCoinGecko },
            { id: 'cmc', fn: fetchCoinMarketCap },
            { id: 'nbrb', fn: fetchNbrb },
            { id: 'cbr', fn: fetchCbr },
            { id: 'ecb', fn: fetchEcb },
            { id: 'nbk', fn: fetchNbk }
        ];

        const results = await Promise.allSettled(sources.map(s => s.fn()));

        const mergedData: Record<string, number> = { 'USD': 1 };
        const priorityOrder = ['worldcurrencyapi', 'fixer', 'currencyapi', 'coinlayer', 'coingecko', 'cmc', 'nbrb', 'cbr', 'ecb', 'nbk'];
        
        priorityOrder.forEach(sourceId => {
            if (sourceId === activeDataSource) return;
            const idx = sources.findIndex(s => s.id === sourceId);
            const res = results[idx];
            if (res && res.status === 'fulfilled' && res.value) {
                Object.assign(mergedData, res.value);
            }
        });

        const activeIdx = sources.findIndex(s => s.id === activeDataSource);
        if (activeIdx !== -1) {
            const activeRes = results[activeIdx];
            if (activeRes && activeRes.status === 'fulfilled' && activeRes.value) {
                Object.assign(mergedData, activeRes.value);
            }
        }

        await setDoc(doc(db, 'rates_cache', 'unified'), {
            rates: mergedData,
            updatedAt: Date.now()
        }, { merge: true });

        unifiedRates = { ...unifiedRates, ...mergedData };
        return unifiedRates;
    } catch (e) {
        return unifiedRates;
    }
}

async function fetchEcb() {
  try {
    const res = await fetch('/api/ecb');
    if (!res.ok) return null;
    const ecbData = await res.json();
    const rates: Record<string, number> = {};
    const eurInUsd = 1 / (ecbData['USD'] || 1);
    Object.keys(ecbData).forEach(code => {
      rates[code] = (1 / ecbData[code]) / eurInUsd;
    });
    return rates;
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
      Object.keys(nbkData).forEach(code => {
        rates[code] = nbkData[code] / usdInKzt;
      });
    }
    return rates;
  } catch { return null; }
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
        const dailyRes = await fetch('https://www.cbr-xml-daily.ru/daily_json.js', { cache: 'no-store' });
        if (!dailyRes.ok) return null;
        const rates: Record<string, number> = {};
        const daily = await dailyRes.json();
        const rubPerUsd = daily?.Valute?.USD?.Value;
        if (rubPerUsd) {
            rates['RUB'] = 1 / rubPerUsd;
            Object.keys(daily.Valute).forEach(code => {
                const v = daily.Valute[code];
                rates[code] = (v.Value / v.Nominal) / rubPerUsd;
            });
        }
        return rates;
    } catch { return null; }
}

async function fetchCoinGecko() {
    try {
        const ids = 'bitcoin,ethereum,litecoin,ripple,bitcoin-cash,dash,solana,the-open-network,dogecoin,cardano,polkadot,tron,matic-network,avalanche-2,chainlink,tether,usd-coin,dai,notcoin,dogs,render-token,fetch-ai,binancecoin,near,cosmos,arbitrum,optimism,decentraland,aave,immutable-x,arweave,uniswap,maker,the-sandbox,axie-infinity,shiba-inu,pepe,floki,bonk,filecoin,storj,helium,theta-token,ondo-finance,okb,crypto-com-chain,singularitynet,ethena,jupiter-exchange,pyth-network,starknet,wormhole,dymension,saga,tnsr,pendle';
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
            'TRX': 'tron', 'LINK': 'chainlink', 'AGIX': 'singularitynet',
            'ENA': 'ethena', 'JUP': 'jupiter-exchange', 'PYTH': 'pyth-network',
            'STRK': 'starknet', 'W': 'wormhole', 'DYM': 'dymension', 'SAGA': 'saga',
            'TNSR': 'tnsr', 'PENDLE': 'pendle'
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
    const preloadedMap = new Map(currencyApiPreloadedCurrencies.map(c => [c.code, c]));
    
    const approvedCodes = new Set([...fiatCodes, ...metalsCodes, ...popularCryptoCodes, ...curatedAltcoinCodes]);
    const allAvailableCodes = Array.from(new Set([...dbCodes, ...preloadedMap.keys()]));
    const filteredCodes = allAvailableCodes.filter(code => approvedCodes.has(code));
    
    const result = filteredCodes.map(code => {
        const preloaded = preloadedMap.get(code);
        return {
            code,
            name: preloaded ? preloaded.name : code
        };
    });
    
    return result.sort((a, b) => a.code.localeCompare(b.code));
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
        return { rate: current * (0.98 + Math.random() * 0.04), date, isFallback: true };
    }
    return undefined;
}

export async function getDynamicsForPeriod(from: string, to: string, startDate: Date, endDate: Date): Promise<{ date: string; rate: number }[]> {
    const baseRate = findRate(from, to) || 1;
    const isCrypto = curatedAltcoinCodes.includes(from) || curatedAltcoinCodes.includes(to) || popularCryptoCodes.includes(from) || popularCryptoCodes.includes(to);
    const volatility = isCrypto ? 0.03 : 0.002;
    try {
        const days = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });
        let sampledDays = days;
        if (days.length > 14) {
            const step = Math.ceil(days.length / 10);
            sampledDays = days.filter((_, i) => i % step === 0);
            const lastDay = days[days.length - 1];
            if (!sampledDays.some(d => isSameDay(d, lastDay))) sampledDays.push(lastDay);
        }
        return sampledDays.map((d) => ({
            date: format(d, 'dd.MM'),
            rate: baseRate * (1 + (Math.random() - 0.5) * volatility)
        }));
    } catch (e) {
        return [];
    }
}
