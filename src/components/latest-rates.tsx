'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getLatestRates, getDataSource } from '@/lib/currencies';
import type { ExchangeRate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useFirestore } from '@/firebase';

type LatestRatesProps = {
    pairs: string[];
}

export function LatestRates({ pairs }: LatestRatesProps) {
  const [rates, setRates] = useState<(Omit<ExchangeRate, 'rate'> & { rate?: number })[]>([]);
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());
  const { t } = useTranslation();
  const dataSource = getDataSource();
  const firestore = useFirestore();

  useEffect(() => {
    if (pairs.length > 0) {
      const initialData = pairs.map(p => {
        const [from, to] = p.split('/');
        return { from, to, rate: undefined };
      });
      setRates(initialData);

      getLatestRates(pairs, firestore).then(fetchedRates => {
        const fetchedRatesMap = new Map(fetchedRates.map(r => [`${r.from}/${r.to}`, r.rate]));
        
        const updatedRates = pairs.map(p => {
            const [from, to] = p.split('/');
            return { from, to, rate: fetchedRatesMap.get(p) };
        });
        
        setRates(updatedRates);
      });
    } else {
      setRates([]);
    }
  }, [dataSource, pairs, firestore]);

  useEffect(() => {
    if (pairs.length === 0 || rates.some(r => r.rate === undefined)) return;

    const interval = setInterval(async () => {
      const oldRatesMap = new Map(rates.filter(r => r.rate !== undefined).map(r => [`${r.from}-${r.to}`, r.rate!]));
      const newRates = await getLatestRates(pairs, firestore);
      const changed = new Map<string, 'up' | 'down'>();

      const newRatesMap = new Map<string, number>();
      for (const newRate of newRates) {
        const key = `${newRate.from}-${newRate.to}`;
        newRatesMap.set(key, newRate.rate!);
        const oldRate = oldRatesMap.get(key);
        if (oldRate && oldRate !== newRate.rate) {
          changed.set(key, newRate.rate! > oldRate ? 'up' : 'down');
        }
      }
      
      setRates(prevRates => prevRates.map(r => ({ ...r, rate: newRatesMap.get(`${r.from}/${r.to}`) ?? r.rate })));
      setChangedRates(changed);

      if (changed.size > 0) {
        setTimeout(() => setChangedRates(new Map()), 1500);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [rates, pairs, firestore]);

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
        {rates.length === 0 && pairs.length > 0 && (
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
        {rates.length === 0 && pairs.length === 0 && <p className="text-sm text-muted-foreground">{t('latestRates.noPairs')}</p>}
        {rates.length > 0 &&
            <div className="space-y-4">
            {rates.map(({ from, to, rate }) => {
                const changeDirection = rate !== undefined ? changedRates.get(`${from}-${to}`) : undefined;
                const isChanged = !!changeDirection;
                
                return (
                <div
                    key={`${from}-${to}`}
                    className="grid grid-cols-[1fr_auto] items-center text-sm gap-x-4"
                >
                    <div className="flex items-center gap-2 font-medium">
                    <span>{from}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span>{to}</span>
                    </div>
                    <div className={cn(
                    'font-mono transition-all duration-500 justify-self-end', 
                    isChanged && (changeDirection === 'up' ? 'text-positive' : 'text-negative'),
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