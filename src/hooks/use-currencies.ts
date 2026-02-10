'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, cryptoCodes, metalsCodes, popularCryptoCodes } from '@/lib/currencies';
import { useTranslation } from './use-translation';

export function useCurrencies() {
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [fiatCurrencies, setFiatCurrencies] = useState<Currency[]>([]);
    const [metalCurrencies, setMetalCurrencies] = useState<Currency[]>([]);
    const [popularCrypto, setPopularCrypto] = useState<Currency[]>([]);
    const [altcoins, setAltcoins] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const { lang } = useTranslation();

    useEffect(() => {
        const fetchCurrencies = async () => {
            setLoading(true);
            const allCurrencies = await getCurrenciesFromLib();
            
            const metals = allCurrencies.filter(c => metalsCodes.includes(c.code));
            const popCrypto = allCurrencies.filter(c => popularCryptoCodes.includes(c.code));
            const fiat = allCurrencies.filter(c => !cryptoCodes.includes(c.code) && !metalsCodes.includes(c.code));
            const others = allCurrencies.filter(c => cryptoCodes.includes(c.code) && !metalsCodes.includes(c.code) && !popularCryptoCodes.includes(c.code));
            
            setCurrencies(allCurrencies);
            setFiatCurrencies(fiat);
            setMetalCurrencies(metals);
            setPopularCrypto(popCrypto);
            setAltcoins(others);
            setLoading(false);
        };
        
        fetchCurrencies();
    }, [lang]);

    return { 
        currencies, 
        loading, 
        fiatCurrencies, 
        metalCurrencies, 
        popularCrypto, 
        altcoins 
    };
}