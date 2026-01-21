import type { Currency, ExchangeRate } from '@/lib/types';
import {
  DollarSign,
  Euro,
  PoundSterling,
  JapaneseYen,
  RussianRuble,
  Landmark,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const iconMap: { [key: string]: React.ElementType } = {
  'USD': DollarSign,
  'EUR': Euro,
  'GBP': PoundSterling,
  'JPY': JapaneseYen,
  'RUB': RussianRuble,
};

let currenciesCache: Currency[] | null = null;
let currencyIdMap: { [key: string]: number } = {
    'USD': 431, 'EUR': 451, 'GBP': 449, 'JPY': 452, 'RUB': 456, 'AED': 465, 'CNY': 514
};

export const getCurrencies = async (): Promise<Currency[]> => {
    if (currenciesCache) {
        return currenciesCache;
    }
    try {
        const response = await fetch('https://api.nbrb.by/exrates/currencies');
        if (!response.ok) {
            throw new Error('Failed to fetch currencies from NBRB API');
        }
        const apiCurrencies = await response.json();
        const now = new Date();
        const activeCurrencies: Currency[] = [];
        
        apiCurrencies.forEach((c: any) => {
            if (new Date(c.Cur_DateEnd) > now) {
                activeCurrencies.push({
                    code: c.Cur_Abbreviation,
                    name: c.Cur_Name_Eng,
                    icon: iconMap[c.Cur_Abbreviation as keyof typeof iconMap] || Landmark,
                });
                if (!currencyIdMap[c.Cur_Abbreviation]) {
                    currencyIdMap[c.Cur_Abbreviation] = c.Cur_ID;
                }
            }
        });

        if (!activeCurrencies.some(c => c.code === 'BYN')) {
            activeCurrencies.push({ code: 'BYN', name: 'Belarusian Ruble', icon: Landmark });
        }
        
        activeCurrencies.sort((a, b) => a.code.localeCompare(b.code));
        
        currenciesCache = activeCurrencies;
        return activeCurrencies;
    } catch (e) {
        console.error("Error fetching currencies:", e);
        // Fallback to a minimal hardcoded list
        const fallbackCurrencies = [
          { code: 'USD', name: 'US Dollar', icon: DollarSign },
          { code: 'EUR', name: 'Euro', icon: Euro },
          { code: 'GBP', name: 'British Pound', icon: PoundSterling },
          { code: 'JPY', name: 'Japanese Yen', icon: JapaneseYen },
          { code: 'RUB', name: 'Russian Ruble', icon: RussianRuble },
          { code: 'AED', name: 'UAE Dirham', icon: Landmark },
          { code: 'BYN', name: 'Belarusian Ruble', icon: Landmark },
          { code: 'CNY', name: 'Chinese Yuan', icon: Landmark },
        ];
        currenciesCache = fallbackCurrencies;
        return fallbackCurrencies;
    }
}


let currentRates: ExchangeRate[] = []; // Holds rates vs BYN
let lastFetchTimestamp = 0;

async function fetchAndProcessRates(): Promise<boolean> {
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
    return getLatestRates();
};

export const getHistoricalRate = async (from: string, to: string, date: Date): Promise<number | undefined> => {
    if (from === to) return 1;

    const formattedDate = format(date, 'yyyy-MM-dd');

    const getRateVsByn = async (currencyCode: string): Promise<number | undefined> => {
        if (currencyCode === 'BYN') return 1;
        // Ensure currencies are loaded to populate the map
        await getCurrencies();
        const curId = currencyIdMap[currencyCode];
        if (!curId) return undefined;

        try {
            const response = await fetch(`https://api.nbrb.by/exrates/rates/${curId}?ondate=${formattedDate}`);
            if (response.ok) {
                const data = await response.json();
                return data.Cur_OfficialRate / data.Cur_Scale;
            }
            
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

export const getDynamicsForPeriod = async (from: string, to: string, endDate: Date, days: number = 30): Promise<{ date: string, rate: number }[]> => {
    if (from === to) {
        const rate = 1;
        const result: { date: string, rate: number }[] = [];
        for (let i = 0; i < days; i++) {
            result.push({ date: format(subDays(endDate, i), 'dd.MM'), rate });
        }
        return result.reverse();
    }
    
    const startDate = subDays(endDate, days - 1);
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    const getRatesForPeriod = async (currencyCode: string): Promise<Map<string, number> | null> => {
        if (currencyCode === 'BYN') {
            const rates = new Map<string, number>();
            for (let i = 0; i < days; i++) {
                const currentDate = subDays(endDate, i);
                const formattedCurrentDate = format(currentDate, 'yyyy-MM-dd');
                // For BYN, we need to check if it's a weekend. There are no rates for weekends.
                // We'll just populate with 1 and let the join handle missing days.
                 rates.set(formattedCurrentDate, 1);
            }
            return rates;
        }
        
        await getCurrencies(); // Ensure map is populated
        const curId = currencyIdMap[currencyCode];
        if (!curId) return null;

        try {
            const response = await fetch(`https://api.nbrb.by/exrates/rates/dynamics/${curId}?startdate=${formattedStartDate}&enddate=${formattedEndDate}`);
            if (!response.ok) return null;

            const data: { Date: string, Cur_OfficialRate: number, Cur_Scale: number }[] = await response.json();
            const rates = new Map<string, number>();
            data.forEach(d => {
                rates.set(format(new Date(d.Date), 'yyyy-MM-dd'), d.Cur_OfficialRate / d.Cur_Scale);
            });
            return rates;
        } catch (e) {
            console.error(`Error fetching dynamics for ${currencyCode}`, e);
            return null;
        }
    }

    const fromRatesMap = await getRatesForPeriod(from);
    const toRatesMap = await getRatesForPeriod(to);

    if (!fromRatesMap || !toRatesMap) return [];
    
    const result: { date: string, rate: number }[] = [];
    
    // Use a date iterator to handle missing days (weekends/holidays)
    let lastKnownFromRate = -1;
    let lastKnownToRate = -1;
    
    for (let i = (days - 1); i >= 0; i--) {
        const currentDate = subDays(endDate, i);
        const formattedCurrentDate = format(currentDate, 'yyyy-MM-dd');
        
        let fromRate = fromRatesMap.get(formattedCurrentDate);
        let toRate = toRatesMap.get(formattedCurrentDate);

        if (fromRate !== undefined) lastKnownFromRate = fromRate;
        else if(lastKnownFromRate !== -1) fromRate = lastKnownFromRate;

        if (toRate !== undefined) lastKnownToRate = toRate;
        else if(lastKnownToRate !== -1) toRate = lastKnownToRate;
        
        if (fromRate !== undefined && toRate !== undefined && toRate !== 0 && fromRate > 0 && toRate > 0) {
            result.push({ date: format(currentDate, 'dd.MM'), rate: fromRate / toRate });
        }
    }

    return result;
}
