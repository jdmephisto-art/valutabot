'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useCurrencies } from '@/hooks/use-currencies';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [open, setOpen] = React.useState(false);

  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code.toLowerCase() === value.toLowerCase()),
    [currencies, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-10 w-full justify-between font-normal"
          disabled={disabled || currencies.length === 0}
        >
          <div className="whitespace-normal text-left text-xs leading-tight">
            {selectedCurrency
              ? `${selectedCurrency.code} - ${selectedCurrency.name}`
              : (placeholder ?? 'Select currency...')}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
         <ScrollArea className="h-72">
            <div className="p-1">
              {currencies.map((currency) => (
                <Button
                    variant="ghost"
                    key={currency.code}
                    onClick={() => {
                        onChange(currency.code);
                        setOpen(false);
                    }}
                    className="w-full justify-start font-normal h-auto py-2"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toLowerCase() === currency.code.toLowerCase() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                   <div className="flex-1 whitespace-normal text-left">
                      <span className="font-semibold">{currency.code}</span>
                      <span className="text-xs"> - {currency.name}</span>
                  </div>
                </Button>
              ))}
            </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
