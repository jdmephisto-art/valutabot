
'use client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';
import { TrendingUp, TrendingDown, Share2 } from 'lucide-react';
import { useTelegram } from '@/hooks/use-telegram';

export function RateUpdateCard({ pair, oldRate, newRate }: { pair: string, oldRate: number, newRate: number }) {
  const { t } = useTranslation();
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

  return (
    <Card className="bg-secondary/70 relative group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("rounded-full p-2 mt-1", isUp ? 'bg-positive/20' : 'bg-negative/20')}>
            {isUp ? <TrendingUp className="h-5 w-5 text-positive" /> : <TrendingDown className="h-5 w-5 text-negative" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-secondary-foreground/90">{t('rateUpdate.title', { pair })}</h3>
            <p className="text-sm mt-1">
              {t('rateUpdate.newRate')} <span className="font-bold text-lg">{newRate.toFixed(4)}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('rateUpdate.change', { change: change.toFixed(2) })}
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleShare}
            title={t('rateUpdate.share')}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
