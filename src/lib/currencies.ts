import type { Currency, ExchangeRate } from '@/lib/types';
import {
  DollarSign,
  Euro,
  PoundSterling,
  JapaneseYen,
  RussianRuble,
  Landmark,
} from 'lucide-react';
import { subDays } from 'date-fns';

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

const initialRates: ExchangeRate[] = [
    { from: 'USD', to: 'EUR', rate: 0.92 },
    { from: 'USD', to: 'GBP', rate: 0.79 },
    { from: 'USD', to: 'JPY', rate: 157.24 },
    { from: 'USD', to: 'RUB', rate: 89.10 },
    { from: 'USD', to: 'AED', rate: 3.67 },
    { from: 'USD', to: 'BYN', rate: 3.28 },
    { from: 'USD', to: 'CNY', rate: 7.25 },
    { from: 'EUR', to: 'USD', rate: 1.08 },
    { from: 'EUR', to: 'GBP', rate: 0.85 },
    { from: 'GBP', to: 'USD', rate: 1.27 },
    { from: 'GBP', to: 'EUR', rate: 1.17 },
    { from: 'BYN', to: 'USD', rate: 0.30 },
    { from: 'CNY', to: 'USD', rate: 0.14 },
    { from: 'RUB', to: 'USD', rate: 1 / 89.10 },
    { from: 'AED', to: 'USD', rate: 1 / 3.67 },
    { from: 'JPY', to: 'USD', rate: 1 / 157.24 },
]

let currentRates: ExchangeRate[] = [...initialRates];

// Function to simulate real-time rate fluctuations
export const getLatestRates = (): ExchangeRate[] => {
    currentRates = currentRates.map(rate => {
        // Fluctuate by a small random amount (+/- 0.5%)
        const fluctuation = (Math.random() - 0.5) * 0.01 * rate.rate;
        return { ...rate, rate: rate.rate + fluctuation };
    });
    return currentRates;
};

export const getInitialRates = (): ExchangeRate[] => {
    return initialRates;
};

export const findRate = (from: string, to: string): number | undefined => {
    if (from === to) return 1;

    const directRate = currentRates.find(r => r.from === from && r.to === to);
    if (directRate) return directRate.rate;
    
    // Try inverse rate
    const inverseRate = currentRates.find(r => r.from === to && r.to === from);
    if (inverseRate) return 1 / inverseRate.rate;

    // Try calculating through USD as a base currency
    const fromUsdRate = findRate(from, 'USD');
    const usdToToRate = findRate('USD', to);

    if (fromUsdRate && usdToToRate) {
        return fromUsdRate * usdToToRate;
    }

    return undefined;
}

export const getHistoricalRate = (from: string, to: string, date: Date): number | undefined => {
    // In a real app, you would fetch this from an API.
    // Here we generate a deterministic pseudo-random rate based on the date.
    const baseRate = findRate(from, to);
    if (baseRate === undefined) return undefined;

    const dateSeed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
    const pairSeed = from.charCodeAt(0) + from.charCodeAt(1) + to.charCodeAt(0) + to.charCodeAt(1);
    
    // Use sin to create a pseudo-random but deterministic fluctuation
    const fluctuation = Math.sin(dateSeed + pairSeed) * 0.1; // Fluctuation up to 10%
    
    return baseRate * (1 + fluctuation);
};

export const getHistoricalRatesForRange = (from: string, to: string, startDate: Date, endDate: Date): {date: Date, rate: number}[] => {
    const rates = [];
    let currentDate = startDate;
    while(currentDate <= endDate) {
        const rate = getHistoricalRate(from, to, currentDate);
        if (rate !== undefined) {
            rates.push({ date: new Date(currentDate), rate });
        }
        currentDate = subDays(currentDate, -1);
    }
    return rates;
}

export const getDailyDynamics = (from: string, to: string, date: Date): { time: string, rate: number }[] => {
    const historicalRate = getHistoricalRate(from, to, date);
    if (historicalRate === undefined) return [];

    const dynamics = [];
    for (let i = 0; i < 24; i++) {
        const hourSeed = i * 100;
        // another deterministic fluctuation for intra-day
        const fluctuation = (Math.sin(date.getTime() + hourSeed + from.charCodeAt(0)) - 0.5) * 0.005; 
        dynamics.push({
            time: `${String(i).padStart(2, '0')}:00`,
            rate: historicalRate * (1 + fluctuation),
        });
    }
    return dynamics;
}
