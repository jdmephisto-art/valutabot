
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { TrendingUp, TrendingDown, Share2, Clock } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';
import { formatDistanceToNow } from 'date-fns';

export function RateUpdateCard({ 
  pair, 
  oldRate, 
  newRate, 
  createdAt,
  context 
}: { 
  pair: string, 
  oldRate: number, 
  newRate: number,
  createdAt?: string,
  context?: 'sinceSet' | 'sinceLast'
}) {
  const { t, dateLocale } = useTranslation();
  const { share, haptic } = useTelegram();
  const change = ((newRate - oldRate) / oldRate) * 100;
  const isUp = newRate > oldRate;

  const handleShare = () => {
    haptic('medium');
    const [from, to] = pair.split('/');
    const shareText = t('notifications.shareText', {
      from,
      to,
      rate: newRate > 1000 ? newRate.toFixed(2) : newRate.toFixed(4).replace(/\.?0+$/, '')
    });
    share(shareText);
  };

  const timeAgo = createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: dateLocale }) : '';

  return (
    <Card className="bg-secondary/70 relative border-primary/10 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-full p-2 mt-1", isUp ? 'bg-positive/20' : 'bg-negative/20')}>
            {isUp ? <TrendingUp className="h-5 w-5 text-positive" /> : <TrendingDown className="h-5 w-5 text-negative" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-foreground/90">{t('rateUpdate.title', { pair })}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-bold text-lg">{newRate.toFixed(4)}</span>
              <span className={cn("text-xs font-bold", isUp ? 'text-positive' : 'text-negative')}>
                {isUp ? '+' : ''}{change.toFixed(2)}%
              </span>
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-1 flex flex-col gap-0.5">
              <span>{context === 'sinceLast' ? t('rateUpdate.sinceLast') : t('rateUpdate.sinceSet')}</span>
              {createdAt && (
                <span className="flex items-center gap-1 opacity-70">
                  <Clock size={8} /> {timeAgo}
                </span>
              )}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary shrink-0"
            onClick={handleShare}
            title={t('rateUpdate.share')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      <div className={cn("h-1 w-full absolute bottom-0", isUp ? 'bg-positive' : 'bg-negative')} />
    </Card>
  )
}
