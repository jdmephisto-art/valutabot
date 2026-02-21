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
  const { currencies, fiatCurrencies, metalCurrencies, popularCrypto, altcoins, loading } = useCurrencies();
  const { t, getCurrencyName } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const selectedCurrency = React.useMemo(
    () => currencies.find((currency) => currency.code.toLowerCase() === value.toLowerCase()),
    [currencies, value]
  );
  
  // High performance filtering: done once when searchTerm or currencies change
  const filteredData = React.useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filterFn = (c: Currency) => {
        if (!term) return true;
        return c.code.toLowerCase().includes(term) || getCurrencyName(c.code).toLowerCase().includes(term);
    };
    
    return {
        fiat: fiatCurrencies.filter(filterFn),
        metals: metalCurrencies.filter(filterFn),
        popular: popularCrypto.filter(filterFn),
        alt: altcoins.filter(filterFn)
    };
  }, [fiatCurrencies, metalCurrencies, popularCrypto, altcoins, searchTerm, getCurrencyName]);

  const isEmpty = filteredData.fiat.length === 0 && 
                  filteredData.metals.length === 0 && 
                  filteredData.popular.length === 0 && 
                  filteredData.alt.length === 0;

  React.useEffect(() => {
    if (!open) {
      setSearchTerm('');
    }
  }, [open]);
  
  const renderCurrencyOption = (currency: Currency) => {
    const name = getCurrencyName(currency.code);
    const hasProperName = name !== currency.code;

    return (
        <button
            key={currency.code}
            onClick={() => {
                onChange(currency.code);
                setOpen(false);
            }}
            className={cn(
                "w-full text-left p-2 text-sm flex items-start justify-start hover:bg-accent rounded-sm transition-colors",
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
               {hasProperName && <span className="text-xs ml-1 text-muted-foreground">{name}</span>}
            </div>
        </button>
    );
  };


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
      <PopoverContent className="w-72 p-0 shadow-xl border-border/60">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={t('combobox.searchPlaceholder')}
            value={searchTerm}
            onValueChange={setSearchTerm}
            className="border-none focus:ring-0"
          />
          <ScrollArea className="h-[350px] p-1">
            {isEmpty ? (
                <div className="p-4 text-center text-sm text-muted-foreground animate-in fade-in">{t('combobox.notFound')}</div>
            ) : (
                <div className="space-y-1">
                    {filteredData.fiat.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-primary uppercase tracking-widest opacity-70">{t('combobox.fiat')}</div>
                            {filteredData.fiat.map(renderCurrencyOption)}
                        </div>
                    )}
                    {filteredData.metals.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="px-2 pt-4 pb-1 text-[10px] font-bold text-amber-600 uppercase tracking-widest opacity-70">{t('combobox.metals')}</div>
                            {filteredData.metals.map(renderCurrencyOption)}
                        </div>
                    )}
                    {filteredData.popular.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="px-2 pt-4 pb-1 text-[10px] font-bold text-positive uppercase tracking-widest opacity-70">{t('combobox.popularCrypto')}</div>
                            {filteredData.popular.map(renderCurrencyOption)}
                        </div>
                    )}
                    {filteredData.alt.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="px-2 pt-4 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">{t('combobox.altcoins')}</div>
                            {filteredData.alt.map(renderCurrencyOption)}
                        </div>
                    )}
                </div>
            )}
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
