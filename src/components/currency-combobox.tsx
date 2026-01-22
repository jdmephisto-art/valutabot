'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrencies } from '@/hooks/use-currencies';

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

  const selectedCurrency = currencies.find(
    (currency) => currency.code.toLowerCase() === value.toLowerCase()
  );

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || currencies.length === 0}
    >
      <SelectTrigger className="w-full font-normal">
        {selectedCurrency ? (
            <span className="truncate">{`${selectedCurrency.code} - ${selectedCurrency.name}`}</span>
        ) : (
            <SelectValue placeholder={placeholder ?? 'Select currency...'} />
        )}
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.code} - {currency.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
