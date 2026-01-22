'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, subscribe } from '@/lib/currencies';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCurrencies = () => {
            setLoading(true);
            getCurrenciesFromLib().then(fetchedCurrencies => {
                setCurrencies(fetchedCurrencies);
                setLoading(false);
            });
        };

        fetchCurrencies(); // Initial fetch

        const unsubscribe = subscribe(fetchCurrencies); // Re-fetch when data source changes
        return () => unsubscribe();
    }, []); // Empty dependency array is correct here, as we are managing subscription manually

    return { currencies, loading };
}
