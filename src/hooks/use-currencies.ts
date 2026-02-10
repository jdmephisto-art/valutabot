'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, metalsCodes, popularCryptoCodes, fiatCodes } from '@/lib/currencies';
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
            
            // Metals are strictly from the metalsCodes list
            const metals = allCurrencies.filter(c => metalsCodes.includes(c.code));
            
            // Popular Crypto are strictly from the popularCryptoCodes list
            const popCrypto = allCurrencies.filter(c => popularCryptoCodes.includes(c.code));
            
            // Fiat are ONLY those in the ISO white list (excluding metals just in case)
            const fiat = allCurrencies.filter(c => fiatCodes.includes(c.code) && !metalsCodes.includes(c.code));
            
            // Altcoins are EVERYTHING ELSE (not in fiat list, not in metals list, not in popular crypto list)
            const others = allCurrencies.filter(c => 
                !fiatCodes.includes(c.code) && 
                !metalsCodes.includes(c.code) && 
                !popularCryptoCodes.includes(c.code)
            );
            
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
