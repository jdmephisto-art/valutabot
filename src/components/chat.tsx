'use client';

import { useState, useEffect, useRef, useId, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, CircleDollarSign, LineChart, BellRing, History, Eye, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LatestRates } from '@/components/latest-rates';
import { CurrencyConverter } from '@/components/currency-converter';
import { NotificationManager } from '@/components/notification-manager';
import { HistoricalRates } from '@/components/historical-rates';
import { TrackingManager } from '@/components/tracking-manager';
import { RateUpdateCard } from '@/components/rate-update-card';
import { DataSourceSwitcher } from '@/components/data-source-switcher';
import type { Alert, DataSource } from '@/lib/types';
import { findRate, getLatestRates, setDataSource, getDataSource, getInitialRates } from '@/lib/currencies';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from './ui/card';
import { useTranslation } from '@/hooks/use-translation';

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
  action: () => void;
};

export function ChatInterface() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trackedPairs, setTrackedPairs] = useState<Map<string, number>>(new Map());
  const [dataSource, setDataSourceState] = useState<DataSource>(getDataSource());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const componentId = useId();

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    setMessages(prev => [...prev, { ...message, id: `${componentId}-${prev.length}` }]);
  }, [componentId]);

  const handleShowRates = () => {
    addMessage({ sender: 'user', text: t('chat.user.showLatestRates') });
    setTimeout(() => addMessage({ sender: 'bot', component: <LatestRates /> }), 500);
  };

  const handleShowConverter = () => {
    addMessage({ sender: 'user', text: t('chat.user.convertCurrency') });
    setTimeout(() => addMessage({ sender: 'bot', component: <CurrencyConverter /> }), 500);
  };

  const handleShowAlertManager = () => {
    addMessage({ sender: 'user', text: t('chat.user.setPriceAlert') });
    setTimeout(() => {
      addMessage({
        sender: 'bot',
        component: <NotificationManager onSetAlert={handleSetAlert} />,
      });
    }, 500);
  };

  const handleShowHistoricalRates = () => {
    addMessage({ sender: 'user', text: t('chat.user.showHistoricalRates') });
    setTimeout(() => {
        addMessage({ sender: 'bot', component: <HistoricalRates /> });
    }, 500);
  }

  const handleShowTrackingManager = () => {
    addMessage({ sender: 'user', text: t('chat.user.trackCurrencyPair') });
    setTimeout(() => {
        addMessage({ sender: 'bot', component: <TrackingManager 
            trackedPairs={Array.from(trackedPairs.keys())}
            onAddPair={handleAddTrackedPair}
            onRemovePair={handleRemoveTrackedPair}
        /> });
    }, 500);
  }
  
  const handleShowDataSourceSwitcher = () => {
    addMessage({ sender: 'user', text: t('chat.user.changeDataSource') });
    setTimeout(() => {
      addMessage({
        sender: 'bot',
        component: <DataSourceSwitcher currentSource={dataSource} onSourceChange={handleDataSourceChange} />,
      });
    }, 500);
  };

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    setDataSourceState(source);
    setMessages([]);
    setAlerts([]);
    setTrackedPairs(new Map());

    toast({
        title: t('chat.dataSourceChanged.toast.title'),
        description: t('chat.dataSourceChanged.toast.description', { source: source.toUpperCase() }),
    });

    setTimeout(() => {
        getInitialRates();
        addMessage({
            sender: 'bot',
            text: t('chat.dataSourceChanged.message', { source: source.toUpperCase() }),
            options: actionButtons,
        });
    }, 100);
  };

  const handleSetAlert = (data: Omit<Alert, 'id' | 'baseRate'>) => {
    const baseRate = findRate(data.from, data.to);
    if (baseRate === undefined) {
      toast({
        variant: 'destructive',
        title: t('chat.setAlert.error.toast.title'),
        description: t('chat.setAlert.error.toast.description'),
      });
      return;
    }
    const newAlert: Alert = { ...data, id: Date.now().toString(), baseRate };
    setAlerts(prev => [...prev, newAlert]);
    toast({
      title: t('chat.setAlert.success.toast.title'),
      description: t('chat.setAlert.success.toast.description', { from: data.from, to: data.to, condition: data.condition, threshold: data.threshold }),
    });
    addMessage({
        sender: 'bot',
        text: t('chat.setAlert.success.message', { from: data.from, to: data.to, condition: data.condition, threshold: data.threshold })
    });
  };

  const handleAddTrackedPair = (from: string, to: string): boolean => {
    const pair = `${from}/${to}`;
    const rate = findRate(from, to);
    if (rate === undefined) {
      toast({
        variant: 'destructive',
        title: t('chat.trackPair.error.toast.title'),
        description: t('chat.trackPair.error.toast.description'),
      });
      return false;
    }
    setTrackedPairs(prev => new Map(prev).set(pair, rate));
    addMessage({ sender: 'bot', text: t('chat.trackPair.success.message', { pair }) });
    return true;
  };

  const handleRemoveTrackedPair = (pair: string) => {
    setTrackedPairs(prev => {
      const newMap = new Map(prev);
      newMap.delete(pair);
      return newMap;
    });
    addMessage({ sender: 'bot', text: t('chat.trackPair.remove.message', { pair }) });
  };
  
  const actionButtons: ActionButtonProps[] = [
    { id: 'rates', label: t('action.latestRates'), icon: LineChart, action: handleShowRates },
    { id: 'convert', label: t('action.convert'), icon: CircleDollarSign, action: handleShowConverter },
    { id: 'alert', label: t('action.setAlert'), icon: BellRing, action: handleShowAlertManager },
    { id: 'history', label: t('action.history'), icon: History, action: handleShowHistoricalRates },
    { id: 'track', label: t('action.track'), icon: Eye, action: handleShowTrackingManager },
    { id: 'settings', label: t('action.dataSource'), icon: Settings, action: handleShowDataSourceSwitcher },
  ];

  useEffect(() => {
    getInitialRates();
    addMessage({
      sender: 'bot',
      text: t('chat.welcome'),
      options: actionButtons,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const checkRates = async () => {
        if(alerts.length === 0 && trackedPairs.size === 0) return;
        
        await getLatestRates(); // to update rates
        
        // Check alerts
        const triggeredAlerts: Alert[] = [];
        const remainingAlerts: Alert[] = [];
        alerts.forEach(alert => {
            const currentRate = findRate(alert.from, alert.to);
            if (currentRate === undefined) {
                remainingAlerts.push(alert);
                return;
            };
            const hasTriggered = (alert.condition === 'above' && currentRate > alert.threshold) || (alert.condition === 'below' && currentRate < alert.threshold);
            if(hasTriggered) {
                triggeredAlerts.push(alert);
                toast({
                    title: t('chat.alert.triggered.toast.title'),
                    description: t('chat.alert.triggered.toast.description', {
                        from: alert.from,
                        to: alert.to,
                        currentRate: currentRate.toFixed(4),
                        condition: t(`notification.condition.${alert.condition}`),
                        threshold: alert.threshold
                    })
                });
            } else {
                remainingAlerts.push(alert);
            }
        });
        if (triggeredAlerts.length > 0) {
            setAlerts(remainingAlerts);
            triggeredAlerts.forEach(alert => {
                const currentRate = findRate(alert.from, alert.to) ?? 0;
                 addMessage({ sender: 'bot', component: <AlertCard alert={alert} currentRate={currentRate} /> })
            })
        }

        // Check tracked pairs
        if (trackedPairs.size > 0) {
            const newTrackedPairs = new Map(trackedPairs);
            let changed = false;
            trackedPairs.forEach((lastRate, pair) => {
                const [from, to] = pair.split('/');
                const currentRate = findRate(from, to);
                if (currentRate !== undefined && Math.abs(currentRate - lastRate) > 1e-9) { // Use a small epsilon for float comparison
                    addMessage({
                        sender: 'bot',
                        component: <RateUpdateCard pair={pair} oldRate={lastRate} newRate={currentRate} />
                    });
                    newTrackedPairs.set(pair, currentRate);
                    changed = true;
                }
            });
            if (changed) {
                setTrackedPairs(newTrackedPairs);
            }
        }
    };
    const interval = setInterval(checkRates, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [alerts, toast, addMessage, trackedPairs, t]);

  return (
    <div className="w-full max-w-md h-[85vh] max-h-[900px] flex flex-col bg-card rounded-2xl shadow-2xl overflow-hidden border">
      <header className="flex items-center p-4 border-b">
        <div className="flex items-center gap-3">
            <div className="relative">
                 <Bot className="h-10 w-10 text-primary" />
                 <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-positive border-2 border-card" />
            </div>
          <div>
            <h1 className="text-lg font-bold">{t('chat.title')}</h1>
            <p className="text-sm text-positive">{t('chat.status.online')}</p>
          </div>
        </div>
      </header>

      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              layout
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={cn('flex items-end gap-2', message.sender === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.sender === 'bot' && <Bot className="h-6 w-6 text-primary self-start flex-shrink-0" />}
              
              <div className={cn('max-w-[85%] rounded-lg', 
                message.sender === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground',
                message.component ? 'p-0 bg-transparent' : 'p-3'
              )}>
                {message.text}
                {message.component}
                {message.options && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 flex-wrap">
                    {message.options.map(option => (
                      <Button key={option.id} variant="outline" size="sm" onClick={option.action} className="bg-background/70">
                        <option.icon className="mr-2 h-4 w-4" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              
              {message.sender === 'user' && <User className="h-6 w-6 text-muted-foreground self-start flex-shrink-0" />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AlertCard({ alert, currentRate }: { alert: Alert; currentRate: number }) {
  const { t } = useTranslation();
  const change = ((currentRate - alert.baseRate) / alert.baseRate) * 100;

  return (
    <Card className="bg-accent/10 border-accent/50">
        <CardContent className="p-4">
            <div className="flex items-start gap-3">
                <div className="bg-accent rounded-full p-2">
                    <BellRing className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                    <h3 className="font-bold text-accent">{t('chat.alert.card.title')}</h3>
                    <p className="text-sm mt-1">
                        <span className="font-semibold">{alert.from}/{alert.to}</span> {t('chat.alert.card.now')} <span className="font-bold">{currentRate.toFixed(4)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {t('chat.alert.card.yourAlert')} {t(`notification.condition.${alert.condition}`)} {alert.threshold}.
                        ({t('chat.alert.card.change')}: <span className={cn(change >= 0 ? 'text-positive' : 'text-negative')}>{change.toFixed(2)}%</span>)
                    </p>
                </div>
            </div>
        </CardContent>
    </Card>
  )
}
