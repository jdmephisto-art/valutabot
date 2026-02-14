import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { LanguageManager } from '@/components/language-manager';
import { FirebaseClientProvider } from '@/firebase';

export const metadata: Metadata = {
  title: 'ВалютаБот | Мониторинг курсов валют и крипты',
  description: 'Интеллектуальный помощник для мониторинга курсов валют, криптовалют, металлов и NFT в реальном времени. Умный конвертер и уведомления в Telegram.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://valutabot.vercel.app'),
  keywords: ['курс валют', 'криптовалюта', 'конвертер', 'биткоин', 'телеграм бот', 'финансы', 'мониторинг'],
  authors: [{ name: 'ValutaBot Team' }],
  openGraph: {
    title: 'ВалютаБот - Ваш финансовый трекер',
    description: 'Конвертер, графики, уведомления о курсах и отслеживание активов в стиле Telegram.',
    url: 'https://valutabot.vercel.app',
    siteName: 'ВалютаБот',
    images: [
      {
        url: 'https://picsum.photos/seed/valuta-og/1200/630',
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
    title: 'ВалютаБот | Мониторинг курсов',
    description: 'Умный конвертер и трекер валют в вашем кармане.',
    images: ['https://picsum.photos/seed/valuta-og/1200/630'],
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
    "description": "Мониторинг курсов валют и криптовалют в реальном времени.",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "All",
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
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={cn('font-body antialiased min-h-screen bg-futuristic relative')}
        suppressHydrationWarning
      >
        <div className="fixed inset-0 bg-grid pointer-events-none z-0 opacity-20" />
        <FirebaseClientProvider>
          <LanguageManager />
          <div className="relative z-10">
            {children}
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
