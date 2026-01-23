'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getInitialRates, getLatestRates, getDataSource } from '@/lib/currencies';
import type { ExchangeRate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function LatestRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());

  useEffect(() => {
    getInitialRates().then(initialRates => {
      setRates(initialRates);
    });
  }, []);

  useEffect(() => {
    // currencyapi.net free tier updates hourly, but we can poll more often for demo purposes
    const interval = setInterval(async () => {
      const oldRates = new Map(rates.map(r => [`${r.from}-${r.to}`, r.rate]));
      const newRates = await getLatestRates();
      const changed = new Map<string, 'up' | 'down'>();

      for (const newRate of newRates) {
        const key = `${newRate.from}-${newRate.to}`;
        const oldRate = oldRates.get(key);
        if (oldRate && oldRate !== newRate.rate) {
          changed.set(key, newRate.rate > oldRate ? 'up' : 'down');
        }
      }
      
      setRates(newRates);
      setChangedRates(changed);

      if (changed.size > 0) {
        setTimeout(() => setChangedRates(new Map()), 1500);
      }
    }, 60000); // Check for new rates every minute

    return () => clearInterval(interval);
  }, [rates]);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Последние курсы</CardTitle>
        <CardDescription>Данные из {getDataSource().toUpperCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        {rates.length === 0 && <p className="text-sm text-muted-foreground">Загрузка курсов...</p>}
        <div className="space-y-4">
          {rates.map(({ from, to, rate }) => {
            const changeDirection = changedRates.get(`${from}-${to}`);
            const isChanged = !!changeDirection;
            
            return (
              <div
                key={`${from}-${to}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 font-medium">
                  <span>{from}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <span>{to}</span>
                </div>
                <div className={cn(
                  'font-mono transition-all duration-500', 
                  isChanged && (changeDirection === 'up' ? 'text-positive' : 'text-negative'),
                  isChanged && 'scale-110'
                  )}>
                  {rate.toFixed(4)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
