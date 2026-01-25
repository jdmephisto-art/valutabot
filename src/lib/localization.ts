import { translations as allTranslations, currencyNames } from './translations';
import type { Language } from './types';

// Default language is 'ru' because default data source is 'nbrb'
let lang: Language = 'ru';

type Listener = (lang: Language) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(lang); // Immediately give the listener the current language
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

    // If a name is not found for Russian, fall back to English.
    if (!name && language === 'ru') {
        const englishNames = currencyNames['en'] as Record<string, string>;
        name = englishNames?.[code];
    }
    
    // If still no name is found (e.g., a new currency code not in any list), return the code.
    return name ?? code;
}

export const translations = allTranslations;
