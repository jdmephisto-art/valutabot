import type { LucideIcon } from 'lucide-react';

export type Currency = {
  code: string;
  name: string;
};

export type ExchangeRate = {
  from: string;
  to: string;
  rate?: number;
  tomorrowRate?: number;
};

export type Alert = {
  id: string;
  from: string;
  to: string;
  condition: 'above' | 'below';
  threshold: number;
  baseRate: number;
  createdAt: string;
};

export type DataSource = 'nbrb' | 'worldcurrencyapi' | 'cbr' | 'ecb' | 'nbk';

export type Language = 'en' | 'ru';

export type HistoricalRateResult = {
  rate: number;
  date: Date;
  isFallback?: boolean;
};

export type PortfolioAsset = {
  code: string;
  amount: number;
};
