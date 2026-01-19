
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

export function RateUpdateCard({ pair, oldRate, newRate }: { pair: string, oldRate: number, newRate: number }) {
  const change = ((newRate - oldRate) / oldRate) * 100;
  const isUp = newRate > oldRate;

  return (
    <Card className="bg-secondary/70">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-full p-2 mt-1", isUp ? 'bg-positive/20' : 'bg-negative/20')}>
            {isUp ? <TrendingUp className="h-5 w-5 text-positive" /> : <TrendingDown className="h-5 w-5 text-negative" />}
          </div>
          <div>
            <h3 className="font-semibold text-secondary-foreground/90">Rate Update: {pair}</h3>
            <p className="text-sm mt-1">
              New rate: <span className="font-bold text-lg">{newRate.toFixed(4)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              (Change: <span className={cn(isUp ? 'text-positive' : 'text-negative')}>{change.toFixed(2)}%</span>)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
