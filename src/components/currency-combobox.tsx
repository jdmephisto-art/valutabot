'use client';

import * as React from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandInput,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import type { Currency } from '@/lib/types';

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
  const { currencies, fiatCurrencies, cryptoCurrencies, loading } = useCurrencies();
  const { t, getCurrencyName } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filterByTerm = (currency: Currency) => {
    if (!searchTerm) return true;
    return currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
           getCurrencyName(currency.code).toLowerCase().includes(searchTerm.toLowerCase());
  };

  const filteredFiat = React.useMemo(() => fiatCurrencies.filter(filterByTerm), [fiatCurrencies, searchTerm, getCurrencyName]);
  const filteredCrypto = React.useMemo(() => cryptoCurrencies.filter(filterByTerm), [cryptoCurrencies, searchTerm, getCurrencyName]);

  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code.toLowerCase() === value.toLowerCase()),
    [currencies, value]
  );
  
  React.useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);
  
  const renderCurrencyOption = (currency: Currency) => (
    <button
        key={currency.code}
        onClick={() => {
            onChange(currency.code);
            setOpen(false);
        }}
        className={cn(
            "w-full text-left p-2 text-sm flex items-start justify-start hover:bg-accent rounded-sm",
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
           <span className="text-xs ml-1">{getCurrencyName(currency.code)}</span>
        </div>
    </button>
  );


  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className="w-full h-10 justify-between"
        >
          <div className="flex items-baseline flex-1 text-left mr-2 overflow-hidden">
            {selectedCurrency
              ? <>
                  <span className="font-medium text-sm">{selectedCurrency.code}</span>
                  <span className="text-muted-foreground text-xs ml-2 truncate">
                    {getCurrencyName(selectedCurrency.code)}
                  </span>
                </>
              : <span className="text-sm">{placeholder ?? t('combobox.placeholder')}</span>}
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
          <ScrollArea className="h-[200px] p-1">
            {filteredFiat.length === 0 && filteredCrypto.length === 0 ? (
                <div className="p-2 text-center text-sm text-muted-foreground">{t('combobox.notFound')}</div>
            ) : (
                <>
                    {filteredFiat.length > 0 && (
                        <>
                            <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{t('combobox.fiat')}</div>
                            {filteredFiat.map(renderCurrencyOption)}
                        </>
                    )}
                    {filteredCrypto.length > 0 && (
                        <>
                            <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">{t('combobox.crypto')}</div>
                            {filteredCrypto.map(renderCurrencyOption)}
                        </>
                    )}
                </>
            )}
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
