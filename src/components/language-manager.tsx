'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/hooks/use-translation';

export function LanguageManager() {
  const { lang, t } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = t('chat.title');
  }, [lang, t]);

  return null; // This component doesn't render anything
}
