'use client';
import { useState, useEffect, useCallback } from 'react';

// This is a placeholder file to prevent build errors after rolling back the localization feature.
// It is not intended to be used.

export function useTranslation() {
    const t = useCallback((key: string, params?: Record<string, string | number>) => {
        const keyParts = key.split('.');
        let result = keyParts[keyParts.length - 1];
        if (params) {
            Object.keys(params).forEach(p => {
                result = result.replace(`{${p}}`, String(params[p]));
            });
        }
        return result;
    }, []);

    return { t, lang: 'ru' };
}
