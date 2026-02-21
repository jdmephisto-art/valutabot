
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { LanguageManager } from '@/components/language-manager';
import { FirebaseClientProvider } from '@/firebase';
import images from '@/app/lib/placeholder-images.json';

export const metadata: Metadata = {
  title: 'ВалютаБот | Мониторинг курсов валют, крипты и металлов',
  description: 'Умный финансовый помощник: актуальные курсы валют (USD, EUR, BYN, RUB, KZT), криптовалют и драгоценных металлов. Конвертер, уведомления в Telegram и отслеживание портфеля.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://valutabot.vercel.app'),
  keywords: [
    'курс валют', 'криптовалюта', 'конвертер', 'биткоин', 'телеграм бот', 'финансы', 'мониторинг', 
    'NBRB', 'ЦБ РФ', 'NBK', 'ECB', 'BYN', 'RUB', 'KZT', 'USD', 'EUR', 'TON', 'портфель активов',
    'currency rates', 'exchange rate', 'crypto tracker', 'forex prices', 'gold price'
  ],
  authors: [{ name: 'ValutaBot Team' }],
  icons: {
    icon: [
      { url: images.icons.favicon, sizes: '32x32', type: 'image/png' },
      { url: images.icons.android192, sizes: '192x192', type: 'image/png' },
    ],
    shortcut: { url: images.icons.favicon, type: 'image/png' },
    apple: [
      { url: images.icons.apple, sizes: '180x180', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: '/',
    languages: {
      'ru-RU': '/',
      'en-US': '/',
    },
  },
  openGraph: {
    title: 'ВалютаБот - Ваш личный финансовый трекер',
    description: 'Конвертер, графики, уведомления о курсах и отслеживание активов в стиле Telegram.',
    url: 'https://valutabot.vercel.app',
    siteName: 'ВалютаБот',
    images: [
      {
        url: images.og.main,
        width: 1200,
        height: 630,
        alt: 'ВалютаБот Интерфейс',
      },
    ],
    locale: 'ru_RU',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ВалютаБот | Курсы валют онлайн',
    description: 'Умный конвертер и трекер активов в вашем Telegram.',
    images: [images.og.main],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ВалютаБот',
  },
};

export const viewport: Viewport = {
  themeColor: '#2962FF',
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "ВалютаБот",
    "description": "Мониторинг курсов валют и криптовалют в реальном времени с уведомлениями.",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "All",
    "url": "https://valutabot.vercel.app",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-futuristic relative')} suppressHydrationWarning>
        <div className="fixed inset-0 bg-grid pointer-events-none z-0 opacity-20" />
        <FirebaseClientProvider>
          <LanguageManager />
          <div className="relative z-10">{children}</div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
