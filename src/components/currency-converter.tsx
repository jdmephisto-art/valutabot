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
        // Принудительно проверяем кэш перед расчетом
        await preFetchInitialRates(firestore);
        const rate = await findRateAsync(fromCurrency, toCurrency, firestore);
        
        setDisplayRate(rate);

        if (rate && amount) {
          const result = parseFloat(amount) * rate;
          // Для крипты и металлов больше знаков, для обычных валют 2-4
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
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none w-full overflow-hidden">
      <CardHeader className="px-4 pb-4">
        <CardTitle className="text-lg font-semibold">{t('converter.title')}</CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="space-y-6">
          <div className="flex flex-col gap-4">
            {/* Выбор валют - Строгая симметрия */}
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1">
                <CurrencyCombobox 
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  placeholder={t('converter.from')}
                  disabled={currencies.length === 0}
                />
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleSwapCurrencies} 
                className="h-10 w-10 shrink-0 hover:bg-primary/10 transition-colors"
              >
                <ArrowRightLeft className="h-4 w-4 text-primary" />
              </Button>

              <div className="flex-1">
                <CurrencyCombobox
                  value={toCurrency}
                  onChange={setToCurrency}
                  placeholder={t('converter.to')}
                  disabled={currencies.length === 0}
                />
              </div>
            </div>

            {/* Поля ввода - Строгая симметрия */}
            <div className="flex gap-4 w-full">
              <div className="flex-1 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider pl-1">{t('converter.amount')}</p>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="text-sm h-11 border-primary/20 focus-visible:ring-primary"
                />
              </div>
              <div className="flex-1 space-y-1.5">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider pl-1">{t('converter.converted')}</p>
                <Input
                  type="text"
                  placeholder={isConverting ? "..." : "0.00"}
                  value={isConverting ? '' : convertedAmount}
                  readOnly
                  className="bg-muted/30 text-sm font-semibold h-11 border-dashed border-primary/20"
                />
              </div>
            </div>
          </div>
          
          {amount && !isConverting && convertedAmount && displayRate && (
             <div className="pt-4 border-t border-border/50">
               <div className="bg-primary/5 rounded-lg p-2">
                 <p className="text-center text-primary text-[11px] font-mono break-all leading-relaxed">
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
