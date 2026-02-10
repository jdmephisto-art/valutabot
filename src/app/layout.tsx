
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { LanguageManager } from '@/components/language-manager';
import { FirebaseClientProvider } from '@/firebase';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'ВалютаБот | Мониторинг курсов валют и крипты',
  description: 'Интеллектуальный помощник для мониторинга курсов валют, криптовалют, металлов и NFT-активов в реальном времени.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://valutabot.app'), // Замените на ваш будущий домен
  openGraph: {
    title: 'ВалютаБот - Ваш финансовый трекер в Telegram стиле',
    description: 'Конвертер, графики, уведомления о курсах и отслеживание активов.',
    url: 'https://valutabot.app',
    siteName: 'ВалютаБот',
    locale: 'ru_RU',
    type: 'website',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ВалютаБот',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn('font-body antialiased', 'min-h-screen bg-background')}
        suppressHydrationWarning
      >
        <FirebaseClientProvider>
          <LanguageManager />
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
