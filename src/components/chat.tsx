'use client';

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, CircleDollarSign, LineChart, BellRing, History, Eye, Settings, Eraser, Timer, List, Box } from 'lucide-react';
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
import { DisplayedPairManager } from '@/components/displayed-pair-manager';
import { OtherAssetsView } from '@/components/other-assets-view';
import type { Alert, DataSource, Language } from '@/lib/types';
import { findRateAsync, getLatestRates, setDataSource, getDataSource, preFetchInitialRates } from '@/lib/currencies';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useFirestore } from '@/firebase';

type Message = {
  id: string;
  sender: 'bot' | 'user';
  component?: React.ReactNode;
  text?: string;
  options?: ActionButtonProps[];
};

type ActionButtonProps = {
  id: string;
  label: string;
  icon: React.ElementType;
};

const defaultDisplayedPairs = ['USD/EUR', 'EUR/USD', 'USD/BYN', 'EUR/BYN', 'USD/RUB', 'EUR/RUB', 'BTC/USD', 'TON/USD'];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trackedPairs, setTrackedPairs] = useState<Map<string, number>>(new Map());
  const [displayedPairs, setDisplayedPairs] = useState<string[]>(defaultDisplayedPairs);
  const [dataSource, setDataSourceState] = useState<DataSource>(getDataSource());
  const [autoClearMinutes, setAutoClearMinutes] = useState(0);
  const [autoClearPopoverOpen, setAutoClearPopoverOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const componentId = useId();
  const { t, lang, setLang } = useTranslation();
  const firestore = useFirestore();

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: `${componentId}-${prev.length}` }]);
  }, [componentId]);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
        // Use a small delay to ensure content is rendered
        setTimeout(() => {
            scrollAreaRef.current?.scrollTo({
                top: scrollAreaRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-clear logic
  useEffect(() => {
    if (autoClearMinutes > 0) {
        const timer = setTimeout(() => {
            setMessages([]);
            resetChat();
        }, autoClearMinutes * 60 * 1000);
        return () => clearTimeout(timer);
    }
  }, [autoClearMinutes, messages.length]);

  const getActionButtons = useCallback((): ActionButtonProps[] => [
    { id: 'rates', label: t('chat.showRates'), icon: LineChart },
    { id: 'other_assets', label: t('chat.showOtherAssets'), icon: Box },
    { id: 'configure_pairs', label: t('chat.showDisplayedPairManager'), icon: List },
    { id: 'convert', label: t('chat.showConverter'), icon: CircleDollarSign },
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
    preFetchInitialRates(firestore);
  };

  const handleActionClick = (id: string) => {
    addMessage({ sender: 'user', text: t(`chat.user.${id}`) });
    
    setTimeout(() => {
      let component: React.ReactNode = null;
      if (id === 'rates') component = <LatestRates pairs={displayedPairs} />;
      if (id === 'other_assets') component = <OtherAssetsView onShowRate={(from) => {
          addMessage({ sender: 'bot', component: <LatestRates pairs={[`${from}/USD`]} /> });
          scrollToBottom();
      }} />;
      if (id === 'configure_pairs') component = <DisplayedPairManager pairs={displayedPairs} onAddPair={(f, t) => { setDisplayedPairs(prev => [...prev, `${f}/${t}`]); return true; }} onRemovePair={(p) => setDisplayedPairs(prev => prev.filter(x => x !== p))} />;
      if (id === 'convert') component = <CurrencyConverter />;
      if (id === 'alert') component = <NotificationManager onSetAlert={(data) => {
        findRateAsync(data.from, data.to, firestore).then(rate => {
          if (rate) {
            setAlerts(prev => [...prev, { ...data, id: Date.now().toString(), baseRate: rate }]);
            addMessage({ sender: 'bot', text: t('chat.bot.alertSet', { from: data.from, to: data.to, condition: data.condition === 'above' ? t('notifications.above') : t('notifications.below'), threshold: data.threshold }) });
          }
        });
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
    preFetchInitialRates(firestore);
  }, [lang, resetChat, firestore]);

  return (
    <div className="w-full max-w-md h-[85vh] max-h-[900px] flex flex-col bg-card rounded-2xl shadow-2xl overflow-hidden border">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Bot className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-lg font-bold">{t('chat.title')}</h1>
            <p className="text-sm text-positive">{t('chat.online')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Popover open={autoClearPopoverOpen} onOpenChange={setAutoClearPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
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
              <Button variant="ghost" size="icon" className="text-xs font-bold">{lang.toUpperCase()}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang('en')}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang('ru')}>Русский</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={resetChat}><Eraser className="h-5 w-5" /></Button>
        </div>
      </header>
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', message.sender === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-lg p-3', message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                {message.text && <p>{message.text}</p>}
                {message.component}
                {message.options && (
                  <div className="flex flex-col gap-2 mt-3">
                    {message.options.map(option => <Button key={option.id} variant="outline" size="sm" onClick={() => handleActionClick(option.id)} className="justify-start"><option.icon className="mr-2 h-4 w-4" />{option.label}</Button>)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}