
'use client';

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, CircleDollarSign, LineChart, BellRing, History, Eye, Settings, Eraser, Timer, List, Check, Box } from 'lucide-react';
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
import { Card, CardContent } from './ui/card';
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

const defaultDisplayedPairs = ['USD/EUR', 'EUR/USD', 'USD/BYN', 'EUR/BYN', 'USD/RUB', 'EUR/RUB', 'BTC/USD', 'ETH/EUR', 'TON/USD', 'SOL/USD'];
const DISPLAYED_PAIRS_STORAGE_KEY = 'currencyBotDisplayedPairs';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trackedPairs, setTrackedPairs] = useState<Map<string, number>>(new Map());
  const [trackingInterval, setTrackingInterval] = useState(30000);
  const [displayedPairs, setDisplayedPairs] = useState<string[]>(defaultDisplayedPairs);
  const [dataSource, setDataSourceState] = useState<DataSource>(getDataSource());
  const [autoClearMinutes, setAutoClearMinutes] = useState(0);
  const [autoClearPopoverOpen, setAutoClearPopoverOpen] = useState(false);
  const autoClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const componentId = useId();
  const { t, lang, setLang } = useTranslation();
  const isInitialMount = useRef(true);
  const firestore = useFirestore();

  const displayedPairsRef = useRef(displayedPairs);
  displayedPairsRef.current = displayedPairs;

  const addMessage = (message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: `${componentId}-${prev.length}` }]);
  };
  
  const getActionButtons = (): ActionButtonProps[] => [
    { id: 'rates', label: t('chat.showRates'), icon: LineChart },
    { id: 'other_assets', label: t('chat.showOtherAssets'), icon: Box },
    { id: 'configure_pairs', label: t('chat.showDisplayedPairManager'), icon: List },
    { id: 'convert', label: t('chat.showConverter'), icon: CircleDollarSign },
    { id: 'alert', label: t('chat.setAlert'), icon: BellRing },
    { id: 'history', label: t('chat.showHistory'), icon: History },
    { id: 'track', label: t('chat.trackPair'), icon: Eye },
    { id: 'settings', label: t('chat.switchSource'), icon: Settings },
  ];

  const resetChat = () => {
    setMessages([]);
    addMessage({
      sender: 'bot',
      text: t('chat.placeholder'),
      options: getActionButtons(),
    });
  };

  const handleDataSourceChange = (source: DataSource) => {
    if (source === dataSource) return;
    setDataSource(source);
    setDataSourceState(source);
    resetChat();
    // Non-blocking pre-fetch
    preFetchInitialRates(firestore);
  };
  
  const handleLanguageChange = (newLang: Language) => {
      if (newLang !== lang) setLang(newLang);
  };

  const handleSetAlert = async (data: Omit<Alert, 'id' | 'baseRate'>) => {
    const baseRate = await findRateAsync(data.from, data.to, firestore);
    if (baseRate === undefined) {
      toast({ variant: 'destructive', title: t('notifications.toast.errorTitle') });
      return;
    }
    const newAlert: Alert = { ...data, id: Date.now().toString(), baseRate };
    setAlerts(prev => [...prev, newAlert]);
    addMessage({ sender: 'bot', text: t('chat.bot.alertSet', { from: data.from, to: data.to, condition: data.condition === 'above' ? t('notifications.above') : t('notifications.below'), threshold: data.threshold }) });
  };

  const handleAddTrackedPair = async (from: string, to: string): Promise<boolean> => {
    const rate = await findRateAsync(from, to, firestore);
    if (rate === undefined) return false;
    setTrackedPairs(prev => new Map(prev).set(`${from}/${to}`, rate));
    addMessage({ sender: 'bot', text: t('chat.bot.pairTracked', { pair: `${from}/${to}`, rate: rate.toFixed(4) }) });
    return true;
  };

  const handleActionClick = (id: string) => {
    let messageComponent: React.ReactNode = null;
    const actionMap: Record<string, () => React.ReactNode> = {
      rates: () => <LatestRates pairs={displayedPairs} />,
      other_assets: () => <OtherAssetsView onShowRate={(from) => addMessage({ sender: 'bot', component: <LatestRates pairs={[`${from}/USD`]} /> })} />,
      configure_pairs: () => <DisplayedPairManager pairs={displayedPairs} onAddPair={(f, t) => { setDisplayedPairs(prev => [...prev, `${f}/${t}`]); return true; }} onRemovePair={(p) => setDisplayedPairs(prev => prev.filter(x => x !== p))} />,
      convert: () => <CurrencyConverter />,
      alert: () => <NotificationManager onSetAlert={handleSetAlert} />,
      history: () => <HistoricalRates />,
      track: () => <TrackingManager trackedPairs={Array.from(trackedPairs.keys())} onAddPair={handleAddTrackedPair} onRemovePair={(p) => setTrackedPairs(prev => { const n = new Map(prev); n.delete(p); return n; })} onIntervalChange={setTrackingInterval} currentInterval={trackingInterval} />,
      settings: () => <DataSourceSwitcher currentSource={dataSource} onSourceChange={handleDataSourceChange} />,
    };
  
    if (actionMap[id]) {
      messageComponent = actionMap[id]();
      addMessage({ sender: 'user', text: t(`chat.user.${id}`) });
      setTimeout(() => addMessage({ sender: 'bot', component: messageComponent }), 500);
    }
  };

  useEffect(() => {
    addMessage({ sender: 'bot', text: t('chat.placeholder'), options: getActionButtons() });
    // Non-blocking pre-fetch
    preFetchInitialRates(firestore);
    isInitialMount.current = false;
  }, []);

  return (
    <div className="w-full max-w-md h-[85vh] max-h-[900px] flex flex-col bg-card rounded-2xl shadow-2xl overflow-hidden border">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
            <div className="relative">
                 <Bot className="h-10 w-10 text-primary" />
                 <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-positive border-2 border-card" />
            </div>
          <div>
            <h1 className="text-lg font-bold">{t('chat.title')}</h1>
            <p className="text-sm text-positive">{t('chat.online')}</p>
          </div>
        </div>
        <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                      <div className="flex h-6 w-6 items-center justify-center rounded-sm border bg-transparent text-xs font-bold text-muted-foreground">
                        {lang.toUpperCase()}
                      </div>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLanguageChange('en')}>English</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguageChange('ru')}>Русский</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" onClick={resetChat}><Eraser className="h-5 w-5 text-muted-foreground" /></Button>
        </div>
      </header>
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div key={message.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn('flex items-end gap-2', message.sender === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[85%] rounded-lg p-3', message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground')}>
                {message.text}
                {message.component}
                {message.options && (
                  <div className="flex flex-col gap-2 mt-3">
                    {message.options.map(option => <Button key={option.id} variant="outline" size="sm" onClick={() => handleActionClick(option.id)}><option.icon className="mr-2 h-4 w-4" />{option.label}</Button>)}
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
