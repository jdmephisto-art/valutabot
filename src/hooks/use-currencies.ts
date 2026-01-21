'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib } from '@/lib/currencies';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getCurrenciesFromLib().then(fetchedCurrencies => {
            setCurrencies(fetchedCurrencies);
            setLoading(false);
        });
    }, []);

    return { currencies, loading };
}
