'use client';
import { useState, useEffect, useCallback } from 'react';
import { getLang, setLang as setLangInLib, subscribe, translations, getCurrencyName as getCurrencyNameFromLib } from '@/lib/localization';
import { enUS, ru } from 'date-fns/locale';
import type { Language } from '@/lib/types';

export function useTranslation() {
    const [lang, setLangState] = useState(getLang());

    useEffect(() => {
        const unsubscribe = subscribe(setLangState);
        return () => unsubscribe();
    }, []);
    
    const setLang = useCallback((newLang: Language) => {
        setLangInLib(newLang);
    }, []);

    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        const keys = key.split('.');
        let result: any = translations[lang];
        for (const k of keys) {
            result = result?.[k];
            if (result === undefined) return keys[keys.length - 1];
        }

        if (typeof result === 'string' && params) {
            Object.keys(params).forEach(p => {
                result = result.replace(new RegExp(`\\{${p}\\}`, 'g'), String(params[p]));
            });
        }
        
        return result ?? key;
    }, [lang]);

    const getCurrencyName = useCallback((code: string) => {
        return getCurrencyNameFromLib(code, lang);
    }, [lang]);
    
    const dateLocale = lang === 'ru' ? ru : enUS;

    return { t, lang, setLang, getCurrencyName, dateLocale };
}
