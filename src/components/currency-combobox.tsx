'use client';

import * as React from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './ui/input';
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
  const [searchTerm, setSearchTerm] = React.useState('');

  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code.toLowerCase() === value.toLowerCase()),
    [currencies, value]
  );
  
  const filteredCurrencies = React.useMemo(() => {
    if (!searchTerm) return currencies;
    return currencies.filter(currency => 
      currency.code.toLowerCase().includes(searchTerm.toLowerCase()) || 
      currency.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currencies, searchTerm]);

  React.useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);

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
            {selectedCurrency ? `${selectedCurrency.code} - ${selectedCurrency.name}` : (placeholder ?? 'Select currency...')}
         </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="p-2">
            <Input 
                placeholder="Search currency..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
            />
        </div>
        <ScrollArea className="h-72">
            <div className="p-1">
            {filteredCurrencies.length > 0 ? filteredCurrencies.map((currency) => (
                <Button
                variant="ghost"
                key={currency.code}
                onClick={() => {
                    console.log(`Выбрана валюта: ${currency.code}`);
                    onChange(currency.code);
                    setOpen(false);
                }}
                className="w-full justify-start h-auto"
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
            )) : <p className='p-4 text-sm text-center text-muted-foreground'>No currency found.</p>}
            </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
