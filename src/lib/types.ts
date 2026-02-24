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
  source?: string;
  isOfficial?: boolean;
  effectiveDate?: string;
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
  source?: string;
};

export type PortfolioAsset = {
  code: string;
  amount: number;
};

/**
 * Enhanced structure for multi-source data storage with date anchoring
 * v: value
 * d: effective date (YYYY-MM-DD)
 * off: is official source
 */
export type MultiSourceData = Record<string, Record<string, { 
  v: number, 
  d: string, 
  off: boolean 
}>>;

export type UnifiedRatesCache = {
  data: MultiSourceData;
  dataTomorrow?: MultiSourceData;
  updatedAtCrypto: number;
  updatedAtFiat: number;
  sources_updated: string[];
};
