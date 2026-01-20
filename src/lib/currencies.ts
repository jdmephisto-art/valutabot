import type { Currency, ExchangeRate } from '@/lib/types';
import {
  DollarSign,
  Euro,
  PoundSterling,
  JapaneseYen,
  RussianRuble,
  Landmark,
} from 'lucide-react';
import { format } from 'date-fns';

export const currencies: Currency[] = [
  { code: 'USD', name: 'US Dollar', icon: DollarSign },
  { code: 'EUR', name: 'Euro', icon: Euro },
  { code: 'GBP', name: 'British Pound', icon: PoundSterling },
  { code: 'JPY', name: 'Japanese Yen', icon: JapaneseYen },
  { code: 'RUB', name: 'Russian Ruble', icon: RussianRuble },
  { code: 'AED', name: 'UAE Dirham', icon: Landmark },
  { code: 'BYN', name: 'Belarusian Ruble', icon: Landmark },
  { code: 'CNY', name: 'Chinese Yuan', icon: Landmark },
];

const currencyIdMap: { [key: string]: number } = {
    'USD': 431,
    'EUR': 451,
    'GBP': 449,
    'JPY': 452,
    'RUB': 456,
    'AED': 465,
    'CNY': 514,
};


let currentRates: ExchangeRate[] = []; // Holds rates vs BYN
let lastFetchTimestamp = 0;

async function fetchAndProcessRates(): Promise<boolean> {
    // Fetch only if data is stale (e.g. older than 1 hour) or not present
    if (Date.now() - lastFetchTimestamp < 3600 * 1000 && currentRates.length > 0) {
        return true;
    }
    
    try {
        const response = await fetch('https://api.nbrb.by/exrates/rates?periodicity=0');
        if (!response.ok) {
            console.error("Failed to fetch rates from NBRB API");
            return false;
        }
        const apiRates = await response.json();
        
        const processedRates: ExchangeRate[] = apiRates.map((apiRate: any) => ({
            from: apiRate.Cur_Abbreviation,
            to: 'BYN',
            rate: apiRate.Cur_OfficialRate / apiRate.Cur_Scale
        }));
        processedRates.push({ from: 'BYN', to: 'BYN', rate: 1 });

        currentRates = processedRates;
        lastFetchTimestamp = Date.now();
        return true;
    } catch (e) {
        console.error("Error fetching or processing rates:", e);
        return false;
    }
}

export const findRate = (from: string, to: string): number | undefined => {
    if (currentRates.length === 0) {
        // Rates not loaded yet, this can happen on initial render.
        // We can't fetch here because this function must be synchronous.
        return undefined;
    }
    if (from === to) return 1;

    const fromBynRateData = currentRates.find(r => r.from === from);
    const toBynRateData = currentRates.find(r => r.from === to);

    if (fromBynRateData && toBynRateData) {
        return fromBynRateData.rate / toBynRateData.rate;
    }

    return undefined;
}

export const getLatestRates = async (): Promise<ExchangeRate[]> => {
    await fetchAndProcessRates();
    
    // The pairs to display in the "Latest Rates" card
    const displayedPairs = [
        { from: 'USD', to: 'EUR' },
        { from: 'USD', to: 'GBP' },
        { from: 'USD', to: 'JPY' },
        { from: 'USD', to: 'RUB' },
        { from: 'USD', to: 'CNY' },
        { from: 'USD', to: 'BYN' },
    ];
    
    const ratesForUI: ExchangeRate[] = [];
    for (const pair of displayedPairs) {
        const rate = findRate(pair.from, pair.to);
        if (rate !== undefined) {
            ratesForUI.push({ ...pair, rate });
        }
    }
    return ratesForUI;
};

export const getInitialRates = async (): Promise<ExchangeRate[]> => {
    // Calling this will ensure rates are fetched if they haven't been.
    return getLatestRates();
};

export const getHistoricalRate = async (from: string, to: string, date: Date): Promise<number | undefined> => {
    if (from === to) return 1;

    const formattedDate = format(date, 'yyyy-MM-dd');

    const getRateVsByn = async (currencyCode: string): Promise<number | undefined> => {
        if (currencyCode === 'BYN') return 1;
        const curId = currencyIdMap[currencyCode];
        if (!curId) return undefined;

        try {
            // First try to get rate by currency ID
            const response = await fetch(`https://api.nbrb.by/exrates/rates/${curId}?ondate=${formattedDate}`);
            if (response.ok) {
                const data = await response.json();
                return data.Cur_OfficialRate / data.Cur_Scale;
            }
            
            // Fallback for currencies that might not have a rate on a specific day via ID endpoint
            // (e.g. on weekends for some currencies). Fetch all rates for the day.
            const fallbackResponse = await fetch(`https://api.nbrb.by/exrates/rates?ondate=${formattedDate}&periodicity=0`);
            if (fallbackResponse.ok) {
                const data = await fallbackResponse.json();
                const rateInfo = data.find((r: any) => r.Cur_Abbreviation === currencyCode);
                return rateInfo ? rateInfo.Cur_OfficialRate / rateInfo.Cur_Scale : undefined;
            }
            
            return undefined;

        } catch (e) {
            console.error(`Error fetching historical rate for ${currencyCode} on ${formattedDate}`, e);
            return undefined;
        }
    };
    
    const fromRate = await getRateVsByn(from);
    const toRate = await getRateVsByn(to);

    if (fromRate && toRate) {
        return fromRate / toRate;
    }
    return undefined;
};

// NOTE: The NBRB API provides daily rates, not intraday data.
// This function simulates hourly fluctuations based on the daily rate for demonstration purposes.
export const getDailyDynamics = async (from: string, to: string, date: Date): Promise<{ time: string, rate: number }[]> => {
    const historicalRate = await getHistoricalRate(from, to, date);
    if (historicalRate === undefined) return [];

    const dynamics = [];
    const dateSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const pairSeed = from.charCodeAt(0) + from.charCodeAt(1) + to.charCodeAt(0) + to.charCodeAt(1);

    for (let i = 0; i < 24; i++) {
        const hourSeed = i * 100;
        // another deterministic fluctuation for intra-day
        const fluctuation = (Math.sin(dateSeed + pairSeed + hourSeed)) * 0.005; // Fluctuation up to 0.5%
        dynamics.push({
            time: `${String(i).padStart(2, '0')}:00`,
            rate: historicalRate * (1 + fluctuation),
        });
    }
    return dynamics;
}
