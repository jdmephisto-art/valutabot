'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, cryptoCodes } from '@/lib/currencies';
import { useTranslation } from './use-translation';
import { currencyApiPreloadedCurrencies } from '@/lib/preloaded-data';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
    const [cryptoCurrencies, setCryptoCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const { lang } = useTranslation();

    useEffect(() => {
        const filterAndSetCurrencies = (allCurrencies: Currency[]) => {
            const fiat = allCurrencies.filter(c => !cryptoCodes.includes(c.code));
            const crypto = allCurrencies.filter(c => cryptoCodes.includes(c.code));
            setCurrencies(allCurrencies);
            setFiatCurrencies(fiat);
            setCryptoCurrencies(crypto);
        };
        
        // Use the most comprehensive list for a fast initial render.
        filterAndSetCurrencies(currencyApiPreloadedCurrencies);
        setLoading(false);

        // Then fetch the actual, source-dependent list in the background.
        getCurrenciesFromLib().then(freshCurrencies => {
            filterAndSetCurrencies(freshCurrencies);
        });
    }, [lang]);

    return { currencies, loading, fiatCurrencies, cryptoCurrencies };
}
