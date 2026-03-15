'use client';

import { useEffect, useState } from 'react';

/**
 * Custom hook to safely interact with Telegram WebApp SDK.
 */
export function useTelegram() {
  const [webApp, setWebApp] = useState<any>(null);
  
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'CurrencyAll_bot';
  const defaultAppUrl = `https://t.me/${botUsername}`;

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setWebApp(tg);
    }
  }, []);

  const haptic = (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
    if (webApp?.HapticFeedback) {
      webApp.HapticFeedback.impactOccurred(style);
    }
  };

  const share = (text: string, url: string = defaultAppUrl) => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (webApp) {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank');
    }
  };

  return { webApp, haptic, share };
}
