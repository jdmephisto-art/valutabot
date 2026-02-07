'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, cryptoCodes } from '@/lib/currencies';
import { useTranslation } from './use-translation';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
    const [cryptoCurrencies, setCryptoCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const { lang } = useTranslation();

    useEffect(() => {
        const fetchCurrencies = async () => {
            setLoading(true);
            const allCurrencies = await getCurrenciesFromLib();
            
            const fiat = allCurrencies.filter(c => !cryptoCodes.includes(c.code));
            const crypto = allCurrencies.filter(c => cryptoCodes.includes(c.code));
            
            setCurrencies(allCurrencies);
            setFiatCurrencies(fiat);
            setCryptoCurrencies(crypto);
            setLoading(false);
        };
        
        fetchCurrencies();
    }, [lang]);

    return { currencies, loading, fiatCurrencies, cryptoCurrencies };
}
