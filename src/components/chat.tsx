'use client';

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, CircleDollarSign, LineChart, BellRing, History, Eye, Settings, Eraser, Timer, Box, ArrowUp, ArrowDown, Send, CircleHelp, Smartphone, Apple, Monitor, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LatestRates } from '@/components/latest-rates';
import { CurrencyConverter } from '@/components/currency-converter';
import { NotificationManager } from '@/components/notification-manager';
import { HistoricalRates } from '@/components/historical-rates';
import { TrackingManager } from '@/components/tracking-manager';
import { RateUpdateCard } from '@/components/rate-update-card';
import { DataSourceSwitcher } from '@/components/data-source-switcher';
import { AutoClearManager } from '@/components/auto-clear-manager';
import { OtherAssetsView } from '@/components/other-assets-view';
import { PortfolioManager } from '@/components/portfolio-manager';
import type { Alert, DataSource } from '@/lib/types';
import { findRateAsync, setDataSource, getDataSource, preFetchInitialRates } from '@/lib/currencies';
import { useTranslation } from '@/hooks/use-translation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirestore, useUser, useMemoFirebase, useCollection } from '@/firebase';
import { useTelegram } from '@/hooks/use-telegram';
import { signInAnonymously } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';

type Message = {
  id: string;
  sender: 'bot' | 'user';
  component?: React.ReactNode;
  text?: string;
  options?: ActionButtonProps[];
  isTechnical?: boolean;
};

type ActionButtonProps = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const defaultDisplayedPairs = ['USD/EUR', 'EUR/USD', 'USD/BYN', 'EUR/BYN', 'USD/RUB', 'EUR/RUB', 'BTC/USD', 'TON/USD'];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { haptic, webApp } = useTelegram();
  const { t, lang, setLang } = useTranslation();
  
  const [trackedPairs, setTrackedPairs] = useState<Map<string, number>>(new Map());
  const [displayedPairs, setDisplayedPairs] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('valutabot_displayed_pairs');
      return saved ? JSON.parse(saved) : defaultDisplayedPairs;
    }
    return defaultDisplayedPairs;
  });
  const [dataSource, setDataSourceState] = useState<DataSource>(getDataSource());
  const [autoClearMinutes, setAutoClearMinutes] = useState(0);
  const [autoClearPopoverOpen, setAutoClearPopoverOpen] = useState(false);
  const [pwaPopoverOpen, setPwaPopoverOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const componentId = useId();

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'notifications');
  }, [firestore, user]);
  
  const { data: cloudAlerts } = useCollection<Alert>(alertsQuery);

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: `${componentId}-${prev.length}` }]);
  }, [componentId]);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
        setTimeout(() => {
            scrollAreaRef.current?.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }, 150);
    }
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!user && auth) {
      signInAnonymously(auth);
    }
  }, [user, auth]);

  useEffect(() => {
    if (user && webApp?.initDataUnsafe?.user?.id) {
      const userRef = doc(firestore, 'users', user.uid);
      setDoc(userRef, {
        id: user.uid,
        telegramId: String(webApp.initDataUnsafe.user.id),
        username: webApp.initDataUnsafe.user.username || 'Anonymous',
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  }, [user, webApp, firestore]);

  useEffect(() => {
    localStorage.setItem('valutabot_displayed_pairs', JSON.stringify(displayedPairs));
  }, [displayedPairs]);

  useEffect(() => {
    if (autoClearMinutes > 0) {
        const timer = setTimeout(() => {
            resetChat();
        }, autoClearMinutes * 60 * 1000);
        return () => clearTimeout(timer);
    }
  }, [autoClearMinutes, messages.length]);

  const handleApiError = useCallback((source: string) => {
    const tgId = webApp?.initDataUnsafe?.user?.id;
    fetch('/api/telegram/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: tgId,
        isAdminAlert: true,
        text: `⚠️ <b>Ошибка источника данных!</b>\n\nИсточник <b>${source}</b> недоступен. Используются кэшированные данные.`
      })
    });
    
    addMessage({
      sender: 'bot',
      text: `Внимание: Источник ${source} временно недоступен.`,
      isTechnical: true
    });
  }, [webApp, addMessage]);

  useEffect(() => {
    if (!cloudAlerts || cloudAlerts.length === 0) return;

    const checkInterval = setInterval(async () => {
      const tgId = webApp?.initDataUnsafe?.user?.id;
      
      for (const alert of cloudAlerts) {
        const currentRate = await findRateAsync(alert.from, alert.to, firestore);
        
        if (currentRate) {
          const isTriggered = alert.condition === 'above' 
            ? currentRate >= alert.threshold 
            : currentRate <= alert.threshold;
          
          if (isTriggered) {
            addMessage({
              sender: 'bot',
              text: t('alertCard.title'),
              component: <RateUpdateCard pair={`${alert.from}/${alert.to}`} oldRate={alert.baseRate} newRate={currentRate} />
            });

            if (tgId && user) {
              fetch('/api/telegram/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chatId: tgId,
                  userId: user.uid,
                  alertId: alert.id,
                  text: `🔔 <b>Оповещение о курсе!</b>\n\nПара <b>${alert.from}/${alert.to}</b> достигла <b>${currentRate.toFixed(4)}</b>.\n\nПорог: ${alert.condition === 'above' ? '≥' : '≤'} ${alert.threshold}`
                })
              });
            }

            if (user) {
              const alertRef = doc(firestore, 'users', user.uid, 'notifications', alert.id);
              deleteDoc(alertRef);
            }
          }
        }
      }
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [cloudAlerts, firestore, addMessage, t, webApp, user]);

  const getActionButtons = useCallback((): ActionButtonProps[] => [
    { id: 'rates', label: t('chat.showRates'), icon: LineChart },
    { id: 'convert', label: t('chat.showConverter'), icon: CircleDollarSign },
    { id: 'portfolio', label: t('chat.showPortfolio'), icon: Briefcase },
    { id: 'other_assets', label: t('chat.showOtherAssets'), icon: Box },
    { id: 'alert', label: t('chat.setAlert'), icon: BellRing },
    { id: 'history', label: t('chat.showHistory'), icon: History },
    { id: 'track', label: t('chat.trackPair'), icon: Eye },
    { id: 'settings', label: t('chat.switchSource'), icon: Settings },
  ], [t]);

  const resetChat = useCallback(() => {
    setMessages([]);
    addMessage({
      sender: 'bot',
      text: t('chat.placeholder'),
      options: getActionButtons(),
    });
  }, [addMessage, getActionButtons, t]);

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    setDataSourceState(source);
    resetChat();
    preFetchInitialRates(firestore, handleApiError);
  };

  const handleActionClick = (id: string) => {
    haptic('medium');
    addMessage({ sender: 'user', text: t(`chat.user.${id}`) });
    
    setTimeout(() => {
      let component: React.ReactNode = null;
      if (id === 'rates') component = <LatestRates pairs={displayedPairs} onAddPair={(f, t) => { setDisplayedPairs(prev => [...prev, `${f}/${t}`]); return true; }} onRemovePair={(p) => setDisplayedPairs(prev => prev.filter(x => x !== p))} />;
      if (id === 'portfolio') component = <PortfolioManager />;
      if (id === 'other_assets') component = <OtherAssetsView onShowRate={(from) => {
          addMessage({ sender: 'bot', component: <LatestRates mode="single" pairs={[`${from}/USD`]} /> });
          scrollToBottom();
      }} />;
      if (id === 'convert') component = <CurrencyConverter />;
      if (id === 'alert') component = <NotificationManager onSetAlert={async (data) => {
        const rate = await findRateAsync(data.from, data.to, firestore);
        if (rate && user) {
          const alertId = Date.now().toString();
          const alertRef = doc(firestore, 'users', user.uid, 'notifications', alertId);
          await setDoc(alertRef, {
            ...data,
            id: alertId,
            userId: user.uid,
            baseRate: rate,
            createdAt: new Date().toISOString()
          });

          const alertText = t('chat.bot.alertSet', { 
            from: data.from, 
            to: data.to, 
            condition: data.condition === 'above' ? t('notifications.above') : t('notifications.below'), 
            threshold: data.threshold 
          });
          addMessage({ sender: 'bot', text: alertText });
        }
      }} />;
      if (id === 'history') component = <HistoricalRates />;
      if (id === 'track') component = <TrackingManager trackedPairs={Array.from(trackedPairs.keys())} onAddPair={async (f, t) => {
        const r = await findRateAsync(f, t, firestore);
        if (r) { setTrackedPairs(prev => new Map(prev).set(`${f}/${t}`, r)); return true; }
        return false;
      }} onRemovePair={(p) => setTrackedPairs(prev => { const n = new Map(prev); n.delete(p); return n; })} onIntervalChange={() => {}} currentInterval={30000} />;
      if (id === 'settings') component = <DataSourceSwitcher currentSource={dataSource} onSourceChange={handleDataSourceChange} />;

      addMessage({ sender: 'bot', component });
    }, 400);
  };

  useEffect(() => {
    resetChat();
    preFetchInitialRates(firestore, handleApiError);
  }, [lang, resetChat, firestore, handleApiError]);

  return (
    <div className="w-full max-w-md h-[88vh] max-h-[900px] flex flex-col bg-card/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
      <header className="flex items-center justify-between p-4 border-b bg-background/50">
        <div className="flex items-center gap-3">
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 3 }}>
            <Bot className="h-10 w-10 text-primary" />
          </motion.div>
          <div>
            <span className="text-lg font-bold block leading-tight">{t('chat.title')}</span>
            <p className="text-sm text-positive">{t('chat.online')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => { haptic('light'); window.open('https://t.me/CurrencyAll_bot', '_blank'); }}>
            <Send className="h-5 w-5" />
          </Button>
          <Popover open={autoClearPopoverOpen} onOpenChange={setAutoClearPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" onClick={() => haptic('light')}>
                <Timer className="h-5 w-5" />
                {autoClearMinutes > 0 && <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <AutoClearManager currentMinutes={autoClearMinutes} onSetAutoClear={(m) => { setAutoClearMinutes(m); setAutoClearPopoverOpen(false); }} />
            </PopoverContent>
          </Popover>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-xs font-bold" onClick={() => haptic('light')}>{lang.toUpperCase()}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { haptic('medium'); setLang('en'); }}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { haptic('medium'); setLang('ru'); }}>Русский</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={() => { haptic('heavy'); resetChat(); }}><Eraser className="h-5 w-5" /></Button>
          
          <Popover open={pwaPopoverOpen} onOpenChange={setPwaPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/10" onClick={() => haptic('light')}>
                <CircleHelp className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden border-primary/20 shadow-2xl" align="end">
              <div className="p-4 bg-primary text-primary-foreground">
                <h3 className="font-bold flex items-center gap-2"><Smartphone className="h-4 w-4" />{t('pwa.title')}</h3>
                <p className="text-xs opacity-90 mt-1">{t('pwa.description')}</p>
              </div>
              <div className="p-4 space-y-4 bg-card">
                <div className="flex gap-3"><Apple className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" /><p className="text-sm">{t('pwa.ios')}</p></div>
                <div className="flex gap-3"><Smartphone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" /><p className="text-sm">{t('pwa.android')}</p></div>
                <div className="flex gap-3"><Monitor className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" /><p className="text-sm">{t('pwa.pc')}</p></div>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setPwaPopoverOpen(false)}>{lang === 'ru' ? 'Закрыть' : 'Close'}</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      
      <div className="flex-1 relative overflow-hidden bg-transparent">
        <div ref={scrollAreaRef} className="h-full overflow-y-auto p-4 space-y-6 scroll-smooth">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', message.sender === 'user' ? 'justify-end' : 'justify-start')}>
                <div 
                  className={cn('rounded-lg', message.component ? 'w-full p-0 overflow-hidden bg-background/40' : 'max-w-[85%] p-3', message.sender === 'user' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-secondary text-secondary-foreground border')}
                  data-nosnippet={message.isTechnical ? "true" : undefined}
                >
                  {message.text && <p className={cn(message.component && "p-3 pb-0")}>{message.text}</p>}
                  {message.component}
                  {message.options && (
                    <div className="flex flex-col gap-2 mt-3 p-3 pt-0">
                      {message.options.map(option => <Button key={option.id} variant="outline" size="sm" onClick={() => handleActionClick(option.id)} className="justify-start bg-background/50 hover:bg-primary/10 border-primary/20 transition-all"><option.icon className="mr-2 h-4 w-4" />{option.label}</Button>)}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {messages.length > 3 && (
          <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <Button variant="secondary" size="icon" onClick={() => { haptic('light'); scrollToTop(); }} className="rounded-full shadow-lg h-9 w-9 bg-background/80 backdrop-blur hover:bg-background border"><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="secondary" size="icon" onClick={() => { haptic('light'); scrollToBottom(); }} className="rounded-full shadow-lg h-9 w-9 bg-background/80 backdrop-blur hover:bg-background border"><ArrowDown className="h-4 w-4" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}