'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getInitialRates, getLatestRates, getCurrencies } from '@/lib/currencies';
import type { ExchangeRate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function LatestRates() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());
  const [currencyIconMap, setCurrencyIconMap] = useState<Map<string, React.ElementType>>(new Map());

  useEffect(() => {
    getInitialRates().then(initialRates => {
      setRates(initialRates);
    });
    getCurrencies().then(allCurrencies => {
        setCurrencyIconMap(new Map(allCurrencies.map(c => [c.code, c.icon])));
    });
  }, []);

  useEffect(() => {
    // NBRB rates are updated daily, so frequent polling is not necessary.
    // This interval is for demonstrating UI updates.
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
        <CardTitle className="text-lg font-semibold">Latest Rates</CardTitle>
        <CardDescription>Rates vs USD from NBRB</CardDescription>
      </CardHeader>
      <CardContent>
        {rates.length === 0 && <p className="text-sm text-muted-foreground">Loading rates...</p>}
        <div className="space-y-4">
          {rates.map(({ from, to, rate }) => {
            const FromIcon = currencyIconMap.get(from);
            const ToIcon = currencyIconMap.get(to);
            const changeDirection = changedRates.get(`${from}-${to}`);
            const isChanged = !!changeDirection;
            
            return (
              <div
                key={`${from}-${to}`}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2 font-medium">
                  {FromIcon && <FromIcon className="h-5 w-5 text-muted-foreground" />}
                  <span>{from}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  {ToIcon && <ToIcon className="h-5 w-5 text-muted-foreground" />}
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
