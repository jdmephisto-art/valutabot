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
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';

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
      value={value}
      onValueChange={onChange}
      disabled={disabled || currencies.length === 0}
    >
      <SelectTrigger className="h-auto min-h-10 w-full font-normal">
        <div className="whitespace-normal text-left text-xs leading-tight">
          <SelectValue placeholder={placeholder ?? 'Select currency...'} />
        </div>
      </SelectTrigger>
      <SelectContent>
        <ScrollArea className="h-72">
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
