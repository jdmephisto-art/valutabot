'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Briefcase, PlusCircle, Trash2, Wallet } from 'lucide-react';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';
import { findRate, preFetchInitialRates } from '@/lib/currencies';
import { useFirestore } from '@/firebase';
import type { PortfolioAsset } from '@/lib/types';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

export function PortfolioManager() {
  const { currencies } = useCurrencies();
  const { t, getCurrencyName, lang } = useTranslation();
  const firestore = useFirestore();
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [newAssetCode, setNewAssetCode] = useState('BTC');
  const [newAssetAmount, setNewAssetAmount] = useState('0');

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('valutabot_portfolio');
    if (saved) {
      try {
        setAssets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse portfolio from localStorage', e);
      }
    }
    const savedBase = localStorage.getItem('valutabot_portfolio_base');
    if (savedBase) setDisplayCurrency(savedBase);
    
    preFetchInitialRates(firestore);
  }, [firestore]);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('valutabot_portfolio', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    localStorage.setItem('valutabot_portfolio_base', displayCurrency);
  }, [displayCurrency]);

  const handleAddAsset = () => {
    const amount = parseFloat(newAssetAmount);
    if (isNaN(amount) || amount < 0) return;

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
    setAssets(prev => prev.filter(a => a.code !== code));
  };

  const handleUpdateAmount = (code: string, amountStr: string) => {
    const val = parseFloat(amountStr);
    if (isNaN(val)) return;
    setAssets(prev => prev.map(a => a.code === code ? { ...a, amount: val } : a));
  };

  const totalBalance = useMemo(() => {
    return assets.reduce((sum, asset) => {
      const rate = findRate(asset.code, displayCurrency);
      if (rate) return sum + (asset.amount * rate);
      return sum;
    }, 0);
  }, [assets, displayCurrency]);

  const formatValue = (val: number) => {
    if (val === 0) return '0';
    const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return val.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', options);
  };

  const formatAssetValue = (asset: PortfolioAsset) => {
    const rate = findRate(asset.code, displayCurrency);
    if (!rate) return '...';
    return formatValue(asset.amount * rate);
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Briefcase className="text-primary h-5 w-5" />
          {t('portfolio.title')}
        </CardTitle>
        <CardDescription>{t('portfolio.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Summary */}
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('portfolio.totalBalance')}</span>
            <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{t('portfolio.displayCurrency')}</span>
                <select 
                    value={displayCurrency} 
                    onChange={(e) => setDisplayCurrency(e.target.value)}
                    className="bg-transparent text-xs font-bold focus:outline-none border-b border-primary/30"
                >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="BYN">BYN</option>
                    <option value="RUB">RUB</option>
                    <option value="KZT">KZT</option>
                </select>
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-primary flex items-baseline gap-2">
            {formatValue(totalBalance)}
            <span className="text-sm font-bold opacity-70">{displayCurrency}</span>
          </p>
        </div>

        {/* Add Asset Form */}
        <div className="space-y-3">
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
                className="h-10 text-sm font-mono" 
              />
            </div>
          </div>
          <Button onClick={handleAddAsset} className="w-full h-9" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('portfolio.addAsset')}
          </Button>
        </div>

        {/* Asset List */}
        <div className="space-y-3">
          {assets.length === 0 ? (
            <div className="text-center py-8 opacity-50 space-y-2">
                <Wallet className="mx-auto h-8 w-8 mb-2" />
                <p className="text-sm">{t('portfolio.empty')}</p>
            </div>
          ) : (
            assets.map((asset) => (
              <div key={asset.code} className="group relative flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all border border-border/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-[10px] px-1.5 h-5 bg-background">{asset.code}</Badge>
                    <span className="text-[10px] text-muted-foreground truncate">{getCurrencyName(asset.code)}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <input 
                        type="number" 
                        value={asset.amount} 
                        onChange={(e) => handleUpdateAmount(asset.code, e.target.value)}
                        className="bg-transparent font-mono font-bold text-sm w-24 border-none focus:ring-0 p-0"
                    />
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{t('portfolio.assetValue')}</span>
                    <span className="text-sm font-bold font-mono">
                        {formatAssetValue(asset)} <span className="text-[10px] opacity-60">{displayCurrency}</span>
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-negative opacity-0 group-hover:opacity-100 transition-opacity" 
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
