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
            // We get currencies from the library, which now depends on the data source
            getCurrenciesFromLib().then(fetchedCurrencies => {
                setCurrencies(fetchedCurrencies);
                setLoading(false);
            });
        };

        // Initial fetch
        fetchCurrencies(); 

        // Re-fetch when data source changes by subscribing to the currency store
        const unsubscribe = subscribe(fetchCurrencies); 
        return () => unsubscribe();
    }, []);

    return { currencies, loading };
}
