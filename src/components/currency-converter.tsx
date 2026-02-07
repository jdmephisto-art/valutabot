'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { findRateAsync } from '@/lib/currencies';
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
        const rate = await findRateAsync(fromCurrency, toCurrency, firestore);
        
        setDisplayRate(rate);

        if (rate && amount) {
          const result = parseFloat(amount) * rate;
          setConvertedAmount(result > 1000 ? result.toFixed(2) : result.toFixed(8).replace(/\.?0+$/, ''));
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
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t('converter.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="space-y-1">
                <CurrencyCombobox 
                  value={fromCurrency}
                  onChange={setFromCurrency}
                  placeholder={t('converter.from')}
                  disabled={currencies.length === 0}
                />
              </div>

              <Button variant="ghost" size="icon" onClick={handleSwapCurrencies} className="mt-0">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </Button>

              <div className="space-y-1">
                <CurrencyCombobox
                  value={toCurrency}
                  onChange={setToCurrency}
                  placeholder={t('converter.to')}
                  disabled={currencies.length === 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground pl-1">{t('converter.amount')}</p>
                <Input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground pl-1">{t('converter.converted')}</p>
                <Input
                  type="text"
                  placeholder={isConverting ? "..." : "0.00"}
                  value={isConverting ? '' : convertedAmount}
                  readOnly
                  className="bg-muted/50 text-sm font-semibold"
                />
              </div>
            </div>
          </div>
          
          {amount && !isConverting && convertedAmount && displayRate && (
             <div className="pt-2 border-t border-border/50">
               <p className="text-center text-muted-foreground text-[11px] font-mono break-all">
                  1 {fromCurrency} = {displayRate > 1000 ? displayRate.toFixed(2) : displayRate.toFixed(8).replace(/\.?0+$/, '')} {toCurrency}
              </p>
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}