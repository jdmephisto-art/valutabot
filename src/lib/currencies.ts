import type { Currency, ExchangeRate } from '@/lib/types';
import {
  DollarSign,
  Euro,
  PoundSterling,
  JapaneseYen,
  RussianRuble,
  Landmark,
} from 'lucide-react';

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

const baseRates: Omit<ExchangeRate, 'rate'>[] = [
  { from: 'USD', to: 'EUR' },
  { from: 'USD', to: 'GBP' },
  { from: 'USD', to: 'JPY' },
  { from: 'USD', to: 'RUB' },
  { from: 'USD', to: 'AED' },
  { from: 'EUR', to: 'USD' },
  { from: 'EUR', to: 'GBP' },
  { from: 'GBP', to: 'USD' },
  { from: 'GBP', to: 'EUR' },
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
    const directRate = currentRates.find(r => r.from === from && r.to === to);
    if (directRate) return directRate.rate;
    
    // Try inverse rate
    const inverseRate = currentRates.find(r => r.from === to && r.to === from);
    if (inverseRate) return 1 / inverseRate.rate;

    return undefined;
}
