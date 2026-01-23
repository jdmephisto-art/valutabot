'use client';

import * as React from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
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
          disabled={disabled || currencies.length === 0}
          className="w-full h-auto min-h-10 justify-between"
        >
          <div className="flex-1 whitespace-normal text-left mr-2">
            {selectedCurrency
              ? `${selectedCurrency.code} - ${selectedCurrency.name}`
              : placeholder ?? 'Select currency...'}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandList>
            <CommandEmpty>No currency found.</CommandEmpty>
            <CommandGroup>
              {currencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} - ${currency.name}`} // value for search
                  onSelect={() => {
                    console.log(`Выбрана валюта: ${currency.code}`);
                    onChange(currency.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toLowerCase() === currency.code.toLowerCase()
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 whitespace-normal text-left">
                    <span className="font-semibold">{currency.code}</span>
                    <span className="text-xs"> - {currency.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
