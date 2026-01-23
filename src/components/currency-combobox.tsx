'use client';

import * as React from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from './ui/scroll-area';

type CurrencyComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function CurrencyCombobox({
  value,
  onChange,
  placeholder,
  disabled,
}: CurrencyComboboxProps) {
  const { currencies } = useCurrencies();

  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code.toLowerCase() === value.toLowerCase()),
    [currencies, value]
  );

  return (
    <Select onValueChange={onChange} value={value} disabled={disabled || currencies.length === 0}>
      <SelectTrigger className="w-full [&>span]:truncate">
         {selectedCurrency ? `${selectedCurrency.code} - ${selectedCurrency.name}` : (placeholder ?? 'Select currency...')}
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-72 w-[var(--radix-select-trigger-width)]">
            {currencies.map((currency) => (
                <SelectItem key={currency.code} value={currency.code}>
                <div className="flex-1 whitespace-normal text-left">
                    <span className="font-semibold">{currency.code}</span>
                    <span className="text-xs"> - {currency.name}</span>
                </div>
                </SelectItem>
            ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
