'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { findRate, preFetchInitialRates } from '@/lib/currencies';
import { ArrowRightLeft, Share2, Info } from 'lucide-react';
import { Button } from './ui/button';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';
import { useFirestore } from '@/firebase';
import { useTelegram } from '@/hooks/use-telegram';

export function CurrencyConverter() {
  const { currencies } = useCurrencies();
  const { t } = useTranslation();
  const firestore = useFirestore();
  const { haptic, share } = useTelegram();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [displayRate, setDisplayRate] = useState<number | undefined>(undefined);
  const [tomorrowRate, setTomorrowRate] = useState<number | undefined>(undefined);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => { preFetchInitialRates(firestore); }, [firestore]);

  useEffect(() => {
    const convert = () => {
        if (!fromCurrency || !toCurrency) return;
        setIsConverting(true);
        const rate = findRate(fromCurrency, toCurrency);
        const tRate = findRate(fromCurrency, toCurrency, true);
        setDisplayRate(rate);
        setTomorrowRate(tRate);

        if (rate && amount && !isNaN(parseFloat(amount))) {
          const result = parseFloat(amount) * rate;
          setConvertedAmount(result > 1000 ? result.toFixed(2) : result.toFixed(4).replace(/\.?0+$/, ''));
        } else {
          setConvertedAmount('');
        }
        setIsConverting(false);
    };
    convert();
  }, [fromCurrency, toCurrency, amount]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) setAmount(value);
  };
  
  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  const handleShare = () => {
    haptic('medium');
    share(t('converter.shareText', { amount, from: fromCurrency, result: convertedAmount, to: toCurrency }));
  };

  const hasRateChange = tomorrowRate && displayRate && Math.abs(tomorrowRate - displayRate) > 0.0001;
  const rateDiff = (tomorrowRate && displayRate) ? (tomorrowRate - displayRate) : 0;
  const diffStr = (rateDiff >= 0 ? '+' : '') + rateDiff.toFixed(4);

  return (
    <Card className="bg-transparent border-0 shadow-none w-full px-[6px] py-2 overflow-hidden">
      <CardHeader className="px-1 pb-3 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-bold text-primary">{t('converter.title')}</CardTitle>
        {amount && convertedAmount && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-primary gap-1" onClick={handleShare}>
                <Share2 className="h-3 w-3" />
                {t('converter.share')}
            </Button>
        )}
      </CardHeader>
      <CardContent className="px-1 pb-2">
        <div className="space-y-5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1">
            <CurrencyCombobox value={fromCurrency} onChange={setFromCurrency} disabled={currencies.length === 0} />
            <Button variant="ghost" size="icon" onClick={handleSwapCurrencies} className="h-7 w-7 text-primary shrink-0 mx-0.5"><ArrowRightLeft size={12} /></Button>
            <CurrencyCombobox value={toCurrency} onChange={setToCurrency} disabled={currencies.length === 0} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-0.5">{t('converter.amount')}</p>
              <Input type="text" placeholder="0.00" value={amount} onChange={handleAmountChange} className="text-sm h-11 bg-background/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-0.5">{t('converter.converted')}</p>
              <Input type="text" placeholder={isConverting ? "..." : "0.00"} value={isConverting ? '' : (convertedAmount || '0.00')} readOnly className="bg-muted/50 text-sm font-bold h-11" />
            </div>
          </div>
          
          {hasRateChange && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700 leading-tight">
                {t('converter.tomorrowWarning', { rate: tomorrowRate.toFixed(4), diff: diffStr })}
              </p>
            </div>
          )}

          {amount && !isConverting && convertedAmount && displayRate && (
             <div className="pt-4 border-t border-border/50">
               <div className="bg-primary/10 rounded-lg p-2.5">
                 <p className="text-center text-primary text-[11px] font-mono font-bold">
                    1 {fromCurrency} = {displayRate > 1000 ? displayRate.toFixed(2) : displayRate.toFixed(8).replace(/\.?0+$/, '')} {toCurrency}
                 </p>
               </div>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}