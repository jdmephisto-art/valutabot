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

export function CurrencyConverter() {
  const { currencies } = useCurrencies();
  const { t } = useTranslation();
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
        const rate = await findRateAsync(fromCurrency, toCurrency);
        
        setDisplayRate(rate);

        if (rate && amount) {
          setConvertedAmount((parseFloat(amount) * rate).toFixed(4));
        } else {
          setConvertedAmount('');
        }
        setIsConverting(false);
    };
    convert();
  }, [fromCurrency, toCurrency, amount]);

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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1 min-w-0">
              <CurrencyCombobox 
                value={fromCurrency}
                onChange={setFromCurrency}
                placeholder={t('converter.from')}
                disabled={currencies.length === 0}
              />
              <Input
                type="text"
                placeholder={t('converter.amount')}
                value={amount}
                onChange={handleAmountChange}
              />
            </div>

            <Button variant="ghost" size="icon" onClick={handleSwapCurrencies} className="self-end">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </Button>

            <div className="flex-1 space-y-1 min-w-0">
              <CurrencyCombobox
                value={toCurrency}
                onChange={setToCurrency}
                placeholder={t('converter.to')}
                disabled={currencies.length === 0}
              />
              <Input
                type="text"
                placeholder={isConverting ? t('latestRates.loading') : t('converter.converted')}
                value={isConverting ? '' : convertedAmount}
                readOnly
                className="bg-muted/50"
              />
            </div>
          </div>
          {amount && !isConverting && convertedAmount && displayRate && (
             <p className="text-center text-muted-foreground text-sm font-mono pt-2">
                1 {fromCurrency} = {displayRate.toFixed(4)} {toCurrency}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
