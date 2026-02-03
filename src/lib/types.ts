import type { LucideIcon } from 'lucide-react';

export type Currency = {
  code: string;
  name: string;
};

export type ExchangeRate = {
  from: string;
  to: string;
  rate?: number;
};

export type Alert = {
  id: string;
  from: string;
  to: string;
  condition: 'above' | 'below';
  threshold: number;
  baseRate: number;
};

export type DataSource = 'nbrb' | 'worldcurrencyapi' | 'cbr';

export type Language = 'en' | 'ru';

export type HistoricalRateResult = {
  rate: number;
  date: Date;
};
