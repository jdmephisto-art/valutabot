'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib } from '@/lib/currencies';
import { useTranslation } from './use-translation';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const { lang } = useTranslation();

    useEffect(() => {
        const fetchCurrencies = () => {
            setLoading(true);
            getCurrenciesFromLib().then(fetchedCurrencies => {
                setCurrencies(fetchedCurrencies);
                setLoading(false);
            });
        };

        fetchCurrencies();
    }, [lang]);

    return { currencies, loading };
}
