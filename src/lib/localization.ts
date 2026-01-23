'use client';

// This is a placeholder file to prevent build errors after rolling back the localization feature.
// It is not intended to be used.

type Language = 'en' | 'ru';

export type Translations = any;

export function setLang(lang: Language) {
    // Dummy function
}

export const getLang = (): Language => {
    // Dummy function
    return 'ru';
};

export function t(key: string, params?: Record<string, string | number>): string {
    console.warn(`Localization is disabled. Fallback for key: ${key}`);
    const keyParts = key.split('.');
    let result = keyParts[keyParts.length - 1];
     if (params) {
        return Object.entries(params).reduce((acc, [paramKey, paramValue]) => {
            const regex = new RegExp(`{${paramKey}}`, 'g');
            return acc.replace(regex, String(paramValue));
        }, result);
    }
    return result;
}
