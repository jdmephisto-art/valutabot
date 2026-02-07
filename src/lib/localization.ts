import { translations as allTranslations, currencyNames } from './translations';
import type { Language } from './types';
import { currencyApiPreloadedCurrencies } from './preloaded-data';

// Default language is 'ru'
let lang: Language = 'ru';

type Listener = (lang: Language) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(lang);
    return () => listeners.delete(listener);
}

function notify() {
    listeners.forEach(l => l(lang));
}

export function setLang(newLang: Language) {
    if (lang !== newLang) {
        lang = newLang;
        notify();
    }
}

export function getLang(): Language {
    return lang;
}

export function getCurrencyName(code: string, language: Language): string {
    const names = currencyNames[language] as Record<string, string> | undefined;
    let name = names?.[code];

    // Fallback to English names if Russian is missing
    if (!name && language === 'ru') {
        const englishNames = currencyNames['en'] as Record<string, string>;
        name = englishNames?.[code];
    }
    
    // Fallback to preloaded data if still missing
    if (!name) {
        const preload = currencyApiPreloadedCurrencies.find(c => c.code === code);
        name = preload?.name;
    }
    
    return name ?? code;
}

export const translations = allTranslations;