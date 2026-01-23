'use client';

import * as React from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandInput,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useTranslation } from '@/hooks/use-translation';

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
  const { t } = useTranslation();
  const { currencies } = useCurrencies();
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredCurrencies = React.useMemo(() => {
    if (!searchTerm) {
        return currencies;
    }
    return currencies.filter(currency =>
        currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        currency.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [currencies, searchTerm]);


  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code.toLowerCase() === value.toLowerCase()),
    [currencies, value]
  );
  
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
            {selectedCurrency
              ? `${selectedCurrency.code} - ${selectedCurrency.name}`
              : placeholder ?? t('combobox.placeholder')}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput 
            placeholder={t('combobox.searchPlaceholder')}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <ScrollArea className="h-[200px]">
            {filteredCurrencies.length > 0 ? (
                filteredCurrencies.map((currency) => (
                    <button
                        key={currency.code}
                        onClick={() => {
                            console.log(`Выбрана валюта: ${currency.code}`);
                            onChange(currency.code);
                            setOpen(false);
                        }}
                        className={cn(
                            "w-full text-left p-2 text-sm flex items-start justify-start hover:bg-accent",
                            value.toLowerCase() === currency.code.toLowerCase() && "bg-accent"
                        )}
                    >
                        <Check
                            className={cn(
                            'mr-2 h-4 w-4 shrink-0 mt-0.5',
                            value.toLowerCase() === currency.code.toLowerCase() ? 'opacity-100' : 'opacity-0'
                            )}
                        />
                        <div className="flex-1 whitespace-normal text-left">
                            <span className="font-semibold">{currency.code}</span>
                            <span className="text-xs"> - {currency.name}</span>
                        </div>
                    </button>
                ))
            ) : (
                <div className="p-2 text-center text-sm text-muted-foreground">{t('combobox.notFound')}</div>
            )}
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
