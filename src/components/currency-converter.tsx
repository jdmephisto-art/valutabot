'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currencies, findRate } from '@/lib/currencies';
import { ArrowRightLeft } from 'lucide-react';
import { Button } from './ui/button';

export function CurrencyConverter() {
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [amount, setAmount] = useState('1');
  const [convertedAmount, setConvertedAmount] = useState('');

  useEffect(() => {
    const rate = findRate(fromCurrency, toCurrency);
    if (rate && amount) {
      setConvertedAmount((parseFloat(amount) * rate).toFixed(4));
    } else {
      setConvertedAmount('');
    }
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
        <CardTitle className="text-lg font-semibold">Currency Converter</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Select value={fromCurrency} onValueChange={setFromCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="Amount"
                value={amount}
                onChange={handleAmountChange}
              />
            </div>

            <Button variant="ghost" size="icon" onClick={handleSwapCurrencies} className="self-end">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </Button>

            <div className="flex-1 space-y-1">
              <Select value={toCurrency} onValueChange={setToCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="To" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                placeholder="Converted"
                value={convertedAmount}
                readOnly
                className="bg-muted/50"
              />
            </div>
          </div>
          {amount && convertedAmount && (
             <p className="text-center text-muted-foreground text-sm font-mono pt-2">
                1 {fromCurrency} = {findRate(fromCurrency, toCurrency)?.toFixed(4)} {toCurrency}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
