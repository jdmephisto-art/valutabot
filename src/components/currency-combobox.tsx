'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  const [open, setOpen] = React.useState(false);
  const { currencies } = useCurrencies();

  const selectedCurrency = currencies.find(
    (currency) => currency.code.toLowerCase() === value.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-auto min-h-10"
          disabled={disabled || currencies.length === 0}
        >
          {selectedCurrency ? (
            <div className="whitespace-normal text-left text-xs leading-tight">
              <span className="font-semibold">{selectedCurrency.code}</span>
              <span> - {selectedCurrency.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder ?? 'Select currency...'}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search currency..." />
          <CommandEmpty>No currency found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {currencies.map((currency) => (
                <CommandItem
                  key={currency.code}
                  value={`${currency.code} ${currency.name}`} // This is for search
                  onSelect={() => { // Using a closure to capture the currency code
                    onChange(currency.code);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value.toLowerCase() === currency.code.toLowerCase() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span>
                    <span className="font-medium">{currency.code}</span> - {currency.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
