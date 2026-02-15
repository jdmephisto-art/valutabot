
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getDataSource } from '@/lib/currencies';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore } from '@/firebase';
import { useLatestRatesSWR } from '@/hooks/use-latest-rates-swr';

type LatestRatesProps = {
    pairs: string[];
}

export function LatestRates({ pairs }: LatestRatesProps) {
  const { t } = useTranslation();
  const dataSource = getDataSource();
  const firestore = useFirestore();
  const { rates, isLoading } = useLatestRatesSWR(pairs, firestore);
  
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());
  const [prevRates, setPrevRates] = useState<Map<string, number>>(new Map());

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

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t('latestRates.title')}</CardTitle>
        <CardDescription>{t('latestRates.description', { source: dataSource.toUpperCase() })}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && rates.length === 0 && (
             <div className="space-y-4">
                {pairs.map(p => {
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
        {!isLoading && rates.length === 0 && pairs.length === 0 && <p className="text-sm text-muted-foreground">{t('latestRates.noPairs')}</p>}
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
