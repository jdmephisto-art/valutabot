'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
      onValueChange={onChange}
      value={value}
      disabled={disabled || currencies.length === 0}
    >
      <SelectTrigger className="w-full font-normal h-auto min-h-10">
         <div className="whitespace-normal text-left text-xs leading-tight">
          {selectedCurrency ? (
            <>
              <span className="font-semibold">{selectedCurrency.code}</span>
              <span> - {selectedCurrency.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">{placeholder ?? 'Select currency...'}</span>
          )}
        </div>
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
