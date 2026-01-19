'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitialRates, getLatestRates, currencies } from '@/lib/currencies';
import type { ExchangeRate } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

export function LatestRates() {
  const [rates, setRates] = useState<ExchangeRate[]>(getInitialRates);
  const [changedRates, setChangedRates] = useState<Map<string, 'up' | 'down'>>(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const newRates = getLatestRates();
      const changed = new Map<string, 'up' | 'down'>();

      for (const newRate of newRates) {
        const oldRate = rates.find(r => r.from === newRate.from && r.to === newRate.to);
        if (oldRate && oldRate.rate !== newRate.rate) {
          changed.set(`${newRate.from}-${newRate.to}`, newRate.rate > oldRate.rate ? 'up' : 'down');
        }
      }
      
      setRates(newRates);
      setChangedRates(changed);

      if (changed.size > 0) {
        setTimeout(() => setChangedRates(new Map()), 1500);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [rates]);

  const currencyIconMap = useMemo(() => {
    return new Map(currencies.map(c => [c.code, c.icon]));
  }, []);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Latest Rates</CardTitle>
      </CardHeader>
      <CardContent>
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
