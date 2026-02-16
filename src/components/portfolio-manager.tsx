
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Briefcase, PlusCircle, Trash2, Wallet, Settings2, Share2, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';
import { findRate, preFetchInitialRates } from '@/lib/currencies';
import { useFirestore } from '@/firebase';
import type { PortfolioAsset } from '@/lib/types';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTelegram } from '@/hooks/use-telegram';
import { cn } from '@/lib/utils';

export function PortfolioManager() {
  const { currencies } = useCurrencies();
  const { t, getCurrencyName, lang } = useTranslation();
  const firestore = useFirestore();
  const { haptic, share } = useTelegram();

  const [assets, setAssets] = useState<PortfolioAsset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('valutabot_portfolio');
      try {
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [displayCurrency, setDisplayCurrency] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('valutabot_portfolio_base') || 'USD';
    }
    return 'USD';
  });

  const [lastSeenTotal, setLastSeenTotal] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('valutabot_portfolio_last_total');
        return saved ? parseFloat(saved) : null;
    }
    return null;
  });

  const [newAssetCode, setNewAssetCode] = useState('BTC');
  const [newAssetAmount, setNewAssetAmount] = useState('0');
  const [isBaseCurrencyPickerOpen, setIsBaseCurrencyPickerOpen] = useState(false);

  useEffect(() => {
    preFetchInitialRates(firestore);
  }, [firestore]);

  useEffect(() => {
    localStorage.setItem('valutabot_portfolio', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('valutabot_portfolio_base', displayCurrency);
  }, [displayCurrency]);

  const totalBalance = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const rate = findRate(asset.code, displayCurrency);
      if (rate) return sum + (asset.amount * rate);
      return sum;
    }, 0);
  }, [assets, displayCurrency]);

  useEffect(() => {
    if (totalBalance > 0) {
        localStorage.setItem('valutabot_portfolio_last_total', totalBalance.toString());
    }
  }, [totalBalance]);

  const growthInfo = useMemo(() => {
    if (assets.length === 0) return null;
    if (lastSeenTotal === null || lastSeenTotal === 0 || totalBalance === 0) {
        return { isInitial: true };
    }
    
    const diff = totalBalance - lastSeenTotal;
    const percent = (diff / lastSeenTotal) * 100;
    
    if (Math.abs(percent) < 0.01) {
        return { isStable: true };
    }
    
    return {
        diff: diff.toFixed(2),
        percent: percent.toFixed(2),
        isUp: diff > 0
    };
  }, [totalBalance, lastSeenTotal, assets.length]);

  const handleAddAsset = () => {
    haptic('medium');
    const amount = parseFloat(newAssetAmount);
    if (isNaN(amount) || amount <= 0) return;

    setAssets(prev => {
      const existing = prev.find(a => a.code === newAssetCode);
      if (existing) {
        return prev.map(a => a.code === newAssetCode ? { ...a, amount: a.amount + amount } : a);
      }
      return [...prev, { code: newAssetCode, amount }];
    });
    setNewAssetAmount('0');
  };

  const handleRemoveAsset = (code: string) => {
    haptic('heavy');
    setAssets(prev => prev.filter(a => a.code !== code));
  };

  const handleUpdateAmount = (code: string, amountStr: string) => {
    const val = parseFloat(amountStr);
    if (isNaN(val)) return;
    setAssets(prev => prev.map(a => a.code === code ? { ...a, amount: Math.max(0, val) } : a));
  };

  const formatValue = (val: number) => {
    if (val === 0) return '0';
    const options = { 
      minimumFractionDigits: val < 1 ? 4 : 2, 
      maximumFractionDigits: val < 1 ? 8 : 2 
    };
    return val.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', options);
  };

  const formatAssetValue = (asset: PortfolioAsset) => {
    const rate = findRate(asset.code, displayCurrency);
    if (!rate) return '...';
    return formatValue(asset.amount * rate);
  };

  const handleShare = () => {
    haptic('medium');
    const text = t('portfolio.shareText', {
      balance: formatValue(totalBalance),
      currency: displayCurrency
    });
    share(text);
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Briefcase className="text-primary h-5 w-5" />
            {t('portfolio.title')}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 text-primary hover:bg-primary/10" 
            onClick={handleShare}
            disabled={assets.length === 0}
          >
            <Share2 className="h-4 w-4 mr-1" />
            {t('portfolio.share')}
          </Button>
        </div>
        <CardDescription>{t('portfolio.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 relative overflow-hidden">
          <div className="flex justify-between items-center mb-1 relative z-10">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('portfolio.totalBalance')}</span>
            
            <Popover open={isBaseCurrencyPickerOpen} onOpenChange={setIsBaseCurrencyPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1 hover:bg-primary/20" onClick={() => haptic('light')}>
                  <Settings2 className="h-3 w-3" />
                  {t('portfolio.displayCurrency')}: <span className="font-bold text-primary">{displayCurrency}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <p className="text-[10px] font-bold uppercase mb-2 px-1 text-muted-foreground">{t('portfolio.displayCurrency')}</p>
                <CurrencyCombobox 
                  value={displayCurrency} 
                  onChange={(val) => {
                    setDisplayCurrency(val);
                    setIsBaseCurrencyPickerOpen(false);
                    haptic('medium');
                  }} 
                />
              </PopoverContent>
            </Popover>
          </div>
          <p className="text-2xl font-black font-mono text-primary flex items-baseline gap-2 relative z-10">
            {formatValue(totalBalance)}
            <span className="text-sm font-bold opacity-70">{displayCurrency}</span>
          </p>
          
          {growthInfo && (
            <div className="mt-1">
                {'isStable' in growthInfo ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <Scale size={14} />
                        {t('portfolio.stable')}
                    </div>
                ) : 'isInitial' in growthInfo ? (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <TrendingUp size={14} className="opacity-50" />
                        {lang === 'ru' ? 'Первый расчет...' : 'Initial calculation...'}
                    </div>
                ) : (
                    <div className={cn("flex items-center gap-1 text-[11px] font-bold", growthInfo.isUp ? "text-positive" : "text-negative")}>
                        {growthInfo.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {t('portfolio.growth', { 
                            diff: growthInfo.diff, 
                            percent: growthInfo.percent, 
                            icon: growthInfo.isUp ? '🚀' : '📉' 
                        })}
                    </div>
                )}
            </div>
          )}

          <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
            <Briefcase className="h-24 w-24" />
          </div>
        </div>

        <div className="space-y-3 p-3 bg-background/40 rounded-lg border border-border/50">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">{t('notifications.from')}</label>
              <CurrencyCombobox value={newAssetCode} onChange={setNewAssetCode} disabled={currencies.length === 0} />
            </div>
            <div className="h-10 flex items-center pt-4">
                <Separator orientation="vertical" className="h-6" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">{t('portfolio.amount')}</label>
              <Input 
                type="number" 
                value={newAssetAmount} 
                onChange={(e) => setNewAssetAmount(e.target.value)}
                className="h-10 text-sm font-mono bg-background/50" 
                placeholder="0.00"
              />
            </div>
          </div>
          <Button onClick={handleAddAsset} className="w-full h-9 shadow-sm" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('portfolio.addAsset')}
          </Button>
        </div>

        <div className="space-y-2">
          {assets.length === 0 ? (
            <div className="text-center py-10 opacity-40 space-y-3">
                <Wallet className="mx-auto h-10 w-10 stroke-1" />
                <p className="text-sm">{t('portfolio.empty')}</p>
            </div>
          ) : (
            assets.map((asset) => (
              <div key={asset.code} className="group relative flex items-center justify-between p-3 bg-muted/20 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 h-5 bg-background shadow-none">{asset.code}</Badge>
                    <span className="text-[10px] text-muted-foreground truncate">{getCurrencyName(asset.code)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <input 
                        type="number" 
                        value={asset.amount} 
                        onChange={(e) => handleUpdateAmount(asset.code, e.target.value)}
                        className="bg-transparent font-mono font-bold text-sm w-full border-none focus:ring-0 p-0 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-right flex items-center gap-3 ml-4">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{t('portfolio.assetValue')}</span>
                    <span className="text-sm font-bold font-mono whitespace-nowrap">
                        {formatAssetValue(asset)} <span className="text-[10px] opacity-60 font-sans">{displayCurrency}</span>
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-negative hover:text-negative hover:bg-negative/10 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => handleRemoveAsset(asset.code)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
