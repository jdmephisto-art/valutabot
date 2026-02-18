'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDataSource } from '@/lib/currencies';
import { cn } from '@/lib/utils';
import { ArrowRight, List, Settings2, Share2, Info } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore } from '@/firebase';
import { useLatestRatesSWR } from '@/hooks/use-latest-rates-swr';
import { Button } from '@/components/ui/button';
import { DisplayedPairManager } from '@/components/displayed-pair-manager';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { CurrencyCombobox } from './currency-combobox';
import { useTelegram } from '@/hooks/use-telegram';

type LatestRatesProps = {
    pairs: string[];
    onAddPair?: (from: string, to: string) => boolean;
    onRemovePair?: (pair: string) => void;
    mode?: 'list' | 'single';
}

export function LatestRates({ pairs: initialPairs, onAddPair, onRemovePair, mode = 'list' }: LatestRatesProps) {
  const { t } = useTranslation();
  const dataSource = getDataSource();
  const firestore = useFirestore();
  const { haptic, share } = useTelegram();
  
  const [currentPairs, setCurrentPairs] = useState(initialPairs);
  const { rates, isLoading } = useLatestRatesSWR(currentPairs, firestore);
  
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());
  const [prevRates, setPrevRates] = useState<Map<string, number>>(new Map());
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    setCurrentPairs(initialPairs);
  }, [initialPairs]);

  useEffect(() => {
    if (rates.length === 0) return;
    const changed = new Map<string, 'up' | 'down'>();
    const currentRatesMap = new Map<string, number>();
    rates.forEach(r => {
      const key = `${r.from}/${r.to}`;
      if (r.rate !== undefined) {
        currentRatesMap.set(key, r.rate);
        const prevValue = prevRates.get(key);
        if (prevValue !== undefined && prevValue !== r.rate) {
          changed.set(key, r.rate > prevValue ? 'up' : 'down');
        }
      }
    });
    if (changed.size > 0) {
      setChangedRates(changed);
      setTimeout(() => setChangedRates(new Map()), 2000);
    }
    setPrevRates(currentRatesMap);
  }, [rates]);

  const formatRate = (rate?: number) => {
    if (rate === undefined) return '...';
    if (rate > 1000) return rate.toFixed(2);
    if (rate > 10) return rate.toFixed(4);
    return rate.toFixed(8).replace(/\.?0+$/, '');
  };

  const handleTargetChange = (newTo: string) => {
    const updated = currentPairs.map(p => `${p.split('/')[0]}/${newTo}`);
    setCurrentPairs(updated);
  };

  const handleShare = () => {
    haptic('medium');
    const firstRate = rates[0];
    if (firstRate && firstRate.rate !== undefined) {
        const shareText = t('otherAssets.shareText', {
            from: firstRate.from,
            to: firstRate.to,
            rate: formatRate(firstRate.rate)
        });
        share(shareText);
    }
  };

  const currentTarget = currentPairs[0]?.split('/')[1] || 'USD';

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold">
            {mode === 'single' ? t('latestRates.titleSingle') : t('latestRates.title')}
          </CardTitle>
          <CardDescription>{t('latestRates.description', { source: dataSource.toUpperCase() })}</CardDescription>
        </div>
        <div className="flex items-center gap-1">
          {mode === 'single' && rates.length > 0 && rates[0].rate !== undefined && (
            <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 text-primary">
              <Share2 className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setIsConfigOpen(!isConfigOpen)} className={cn("h-8 w-8 text-primary", isConfigOpen && "bg-primary/10")}>
            {mode === 'single' ? <Settings2 className="h-5 w-5" /> : <List className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen} className="mb-4">
          <CollapsibleContent className="space-y-4 border rounded-lg p-3 bg-background/50 animate-in slide-in-from-top-2 duration-200">
            {mode === 'single' ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('latestRates.targetCurrency')}</p>
                <CurrencyCombobox value={currentTarget} onChange={(val) => { handleTargetChange(val); setIsConfigOpen(false); }} />
              </div>
            ) : (
              onAddPair && onRemovePair && <DisplayedPairManager hideHeader pairs={currentPairs} onAddPair={onAddPair} onRemovePair={onRemovePair} />
            )}
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-4">
          {rates.map(({ from, to, rate, tomorrowRate }) => {
            const key = `${from}/${to}`;
            const isChanged = changedRates.has(key);
            const direction = changedRates.get(key);
            const showTomorrow = tomorrowRate && tomorrowRate !== rate;

            return (
              <div key={key} className="space-y-1">
                <div className="grid grid-cols-[1fr_auto] items-center text-sm gap-x-4">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{from}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{to}</span>
                  </div>
                  <div className={cn(
                    'font-mono transition-all duration-700 justify-self-end',
                    isChanged && (direction === 'up' ? 'text-positive font-bold' : 'text-negative font-bold'),
                    isChanged && 'scale-110'
                  )}>
                    {formatRate(rate)}
                  </div>
                </div>
                {showTomorrow && (
                  <div className="flex justify-end items-center gap-1 opacity-60 text-[10px]">
                    <Info size={10} />
                    <span>{t('latestRates.tomorrow')}: {formatRate(tomorrowRate)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
