'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { findRateAsync, preFetchInitialRates } from '@/lib/currencies';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from './ui/button';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';
import { useFirestore } from '@/firebase';

export function CurrencyConverter() {
  const { currencies } = useCurrencies();
  const { t } = useTranslation();
  const firestore = useFirestore();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState('');
  const [displayRate, setDisplayRate] = useState<number | undefined>(undefined);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const convert = async () => {
        if (!fromCurrency || !toCurrency) return;

        setIsConverting(true);
        await preFetchInitialRates(firestore);
        const rate = await findRateAsync(fromCurrency, toCurrency, firestore);
        
        setDisplayRate(rate);

        if (rate && amount) {
          const result = parseFloat(amount) * rate;
          const isAsset = ['BTC', 'ETH', 'TON', 'XAU', 'XAG', 'NOT', 'DOGS'].includes(toCurrency) || rate < 0.01;
          setConvertedAmount(result > 1000 ? result.toFixed(2) : result.toFixed(isAsset ? 8 : 4).replace(/\.?0+$/, ''));
        } else {
          setConvertedAmount('');
        }
        setIsConverting(false);
    };
    convert();
  }, [fromCurrency, toCurrency, amount, firestore]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };
  
  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  return (
    <Card className="bg-transparent border-0 shadow-none w-full px-[6px] py-2 overflow-hidden">
      <CardHeader className="px-1 pb-3">
        <CardTitle className="text-base font-bold text-primary">{t('converter.title')}</CardTitle>
      </CardHeader>
      <CardContent className="px-1 pb-2">
        <div className="space-y-5">
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 w-full">
              <div className="min-w-0">
                <CurrencyCombobox 
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  placeholder={t('converter.from')}
                  disabled={currencies.length === 0}
                />
              </div>

              <div className="flex justify-center">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleSwapCurrencies} 
                  className="h-9 w-9 hover:bg-primary/10 transition-colors shrink-0"
                >
                  <ArrowRightLeft className="h-4 w-4 text-primary" />
                </Button>
              </div>

              <div className="min-w-0">
                <CurrencyCombobox
                  value={toCurrency}
                  onChange={setToCurrency}
                  placeholder={t('converter.to')}
                  disabled={currencies.length === 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-0.5 truncate">{t('converter.amount')}</p>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="text-sm h-11 border-primary/30 focus-visible:ring-primary w-full bg-background/50"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest pl-0.5 truncate">{t('converter.converted')}</p>
                <Input
                  type="text"
                  placeholder={isConverting ? "..." : "0.00"}
                  value={isConverting ? '' : convertedAmount}
                  readOnly
                  className="bg-muted/50 text-sm font-bold h-11 border-dashed border-primary/30 w-full"
                />
              </div>
            </div>
          </div>
          
          {amount && !isConverting && convertedAmount && displayRate && (
             <div className="pt-4 border-t border-border/50">
               <div className="bg-primary/10 rounded-lg p-2.5">
                 <p className="text-center text-primary text-[11px] font-mono font-bold break-all leading-tight">
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
