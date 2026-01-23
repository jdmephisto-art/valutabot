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

  return (
    <Select
      onValueChange={onChange}
      value={value}
      disabled={disabled || currencies.length === 0}
    >
      <SelectTrigger className="w-full text-left [&>span]:truncate">
        <SelectValue placeholder={placeholder ?? 'Select currency...'} />
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-72">
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {`${currency.code} - ${currency.name}`}
            </SelectItem>
          ))}
        </ScrollArea>
      </SelectContent>
    </Select>
  );
}
