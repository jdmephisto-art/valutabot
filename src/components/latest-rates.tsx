
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDataSource } from '@/lib/currencies';
import { cn } from '@/lib/utils';
import { ArrowRight, List, Settings2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore } from '@/firebase';
import { useLatestRatesSWR } from '@/hooks/use-latest-rates-swr';
import { Button } from '@/components/ui/button';
import { DisplayedPairManager } from '@/components/displayed-pair-manager';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CurrencyCombobox } from './currency-combobox';

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
  
  const [currentPairs, setCurrentPairs] = useState(initialPairs);
  const { rates, isLoading } = useLatestRatesSWR(currentPairs, firestore);
  
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());
  const [prevRates, setPrevRates] = useState<Map<string, number>>(new Map());
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    setCurrentPairs(initialPairs);
  }, [initialPairs]);

  // Detect changes for animation
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
    if (rate === undefined) return <span className="text-xs animate-pulse">...</span>;
    if (rate > 1000) return rate.toFixed(2);
    if (rate > 10) return rate.toFixed(4);
    return rate.toFixed(8).replace(/\.?0+$/, '');
  };

  const handleTargetChange = (newTo: string) => {
    const updated = currentPairs.map(p => {
      const from = p.split('/')[0];
      return `${from}/${newTo}`;
    });
    setCurrentPairs(updated);
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
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={cn("h-8 w-8 text-primary", isConfigOpen && "bg-primary/10")}
          title={mode === 'single' ? t('latestRates.configTarget') : t('displayedPairManager.title')}
        >
          {mode === 'single' ? <Settings2 className="h-5 w-5" /> : <List className="h-5 w-5" />}
        </Button>
      </CardHeader>
      <CardContent>
        <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen} className="mb-4">
          <CollapsibleContent className="space-y-4 border rounded-lg p-3 bg-background/50 animate-in slide-in-from-top-2 duration-200">
            {mode === 'single' ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('latestRates.targetCurrency')}</p>
                <CurrencyCombobox 
                  value={currentTarget}
                  onChange={(val) => {
                    handleTargetChange(val);
                    setIsConfigOpen(false);
                  }}
                />
              </div>
            ) : (
              onAddPair && onRemovePair && (
                <DisplayedPairManager 
                  hideHeader
                  pairs={currentPairs} 
                  onAddPair={onAddPair} 
                  onRemovePair={onRemovePair} 
                />
              )
            )}
          </CollapsibleContent>
        </Collapsible>

        {isLoading && rates.length === 0 && (
             <div className="space-y-4">
                {currentPairs.map(p => {
                    const [from, to] = p.split('/');
                    return (
                        <div key={p} className="grid grid-cols-[1fr_auto] items-center text-sm gap-x-4">
                            <div className="flex items-center gap-2 font-medium">
                                <span>{from}</span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span>{to}</span>
                            </div>
                            <div className="font-mono animate-pulse justify-self-end">...</div>
                        </div>
                    );
                })}
            </div>
        )}
        {!isLoading && rates.length === 0 && currentPairs.length === 0 && <p className="text-sm text-muted-foreground">{t('latestRates.noPairs')}</p>}
        {rates.length > 0 &&
            <div className="space-y-4">
            {rates.map(({ from, to, rate }) => {
                const key = `${from}/${to}`;
                const changeDirection = changedRates.get(key);
                const isChanged = !!changeDirection;
                
                return (
                <div
                    key={key}
                    className="grid grid-cols-[1fr_auto] items-center text-sm gap-x-4"
                >
                    <div className="flex items-center gap-2 font-medium">
                    <span>{from}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{to}</span>
                    </div>
                    <div className={cn(
                    'font-mono transition-all duration-700 justify-self-end', 
                    isChanged && (changeDirection === 'up' ? 'text-positive font-bold' : 'text-negative font-bold'),
                    isChanged && 'scale-110'
                    )}>
                    {formatRate(rate)}
                    </div>
                </div>
                );
            })}
            </div>
        }
      </CardContent>
    </Card>
  );
}
