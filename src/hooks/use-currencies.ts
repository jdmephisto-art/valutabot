'use client';

import { useState, useEffect } from 'react';
import type { Currency } from '@/lib/types';
import { getCurrencies as getCurrenciesFromLib, metalsCodes, popularCryptoCodes, fiatCodes, curatedAltcoinCodes } from '@/lib/currencies';
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
            
            // Metals
            const metals = allCurrencies.filter(c => metalsCodes.includes(c.code));
            
            // Popular Crypto
            const popCrypto = allCurrencies.filter(c => popularCryptoCodes.includes(c.code));
            
            // Fiat (ISO White List)
            const fiat = allCurrencies.filter(c => fiatCodes.includes(c.code));
            
            // Altcoins (Strictly Curated)
            const others = allCurrencies.filter(c => 
                curatedAltcoinCodes.includes(c.code) && 
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
