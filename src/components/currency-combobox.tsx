'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { useCurrencies } from '@/hooks/use-currencies';

type CurrencySelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

// Keeping the name CurrencyCombobox to avoid having to change it in all parent components.
export function CurrencyCombobox({
  value,
  onChange,
  placeholder,
  disabled,
}: CurrencySelectProps) {
  const { currencies } = useCurrencies();

  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code === value),
    [currencies, value]
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || currencies.length === 0}
    >
      <SelectTrigger className="h-auto min-h-10 w-full justify-between font-normal">
        <div className="whitespace-normal text-left text-xs leading-tight">
          {selectedCurrency
            ? `${selectedCurrency.code} - ${selectedCurrency.name}`
            : (placeholder ?? 'Select currency...')}
        </div>
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
             <div className="flex-1 whitespace-normal text-left">
                <span className="font-semibold">{currency.code}</span>
                <span className="text-xs"> - {currency.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
