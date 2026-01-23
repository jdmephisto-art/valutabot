'use client';
import { useState, useEffect, useCallback } from 'react';
import { t as translate, getLang, Translations } from '@/lib/localization';
import { subscribe } from '@/lib/currencies';

export function useTranslation() {
    const [lang, setLang] = useState(getLang());

    useEffect(() => {
        const handleLanguageChange = () => {
            setLang(getLang());
        };
        const unsubscribe = subscribe(handleLanguageChange);
        
        handleLanguageChange();

        return () => unsubscribe();
    }, []);

    const t = useCallback((key: keyof Translations, params?: Record<string, string | number>) => {
        return translate(key, params);
    }, []);

    return { t, lang };
}
