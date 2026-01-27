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

export type DataSource = 'nbrb' | 'currencyapi' | 'cbr';

export type Language = 'en' | 'ru';
