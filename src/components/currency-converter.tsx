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
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none w-full max-w-full overflow-hidden">
      <CardHeader className="px-3 pb-3">
        <CardTitle className="text-base font-semibold">{t('converter.title')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3">
        <div className="space-y-5">
          <div className="space-y-4">
            {/* Выбор валют - Строгая сетка 1fr-auto-1fr */}
            <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-1 w-full">
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
                  className="h-8 w-8 hover:bg-primary/10 transition-colors shrink-0"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
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

            {/* Поля ввода - Строгая симметрия 50/50 через Grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider pl-0.5 truncate">{t('converter.amount')}</p>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="text-xs h-9 border-primary/20 focus-visible:ring-primary w-full"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider pl-0.5 truncate">{t('converter.converted')}</p>
                <Input
                  type="text"
                  placeholder={isConverting ? "..." : "0.00"}
                  value={isConverting ? '' : convertedAmount}
                  readOnly
                  className="bg-muted/30 text-xs font-semibold h-9 border-dashed border-primary/20 w-full"
                />
              </div>
            </div>
          </div>
          
          {amount && !isConverting && convertedAmount && displayRate && (
             <div className="pt-3 border-t border-border/50">
               <div className="bg-primary/5 rounded-md p-1.5">
                 <p className="text-center text-primary text-[10px] font-mono break-all leading-tight">
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
