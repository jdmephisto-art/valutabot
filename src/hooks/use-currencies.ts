'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, getDataSource } from '@/lib/currencies';
import { useTranslation } from './use-translation';
import { nbrbPreloadedCurrencies, currencyApiPreloadedCurrencies } from '@/lib/preloaded-data';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const { lang } = useTranslation();

    useEffect(() => {
        const dataSource = getDataSource();
        // Set preloaded data immediately to make UI responsive
        const preloaded = dataSource === 'nbrb' ? nbrbPreloadedCurrencies : currencyApiPreloadedCurrencies;
        setCurrencies(preloaded);
        setLoading(false);

        // Then fetch the latest list in the background
        getCurrenciesFromLib().then(fetchedCurrencies => {
            // Only update if the fetched data is different, to avoid unnecessary re-renders
            if (JSON.stringify(fetchedCurrencies) !== JSON.stringify(preloaded)) {
                setCurrencies(fetchedCurrencies);
            }
        });
    }, [lang]);

    return { currencies, loading };
}
