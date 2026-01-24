'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { List, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { useState, useMemo } from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';

const getPairSchema = (t: (key: string, params?: Record<string, string | number>) => string) => z.object({
    from: z.string().min(1, t('validation.selectCurrency')),
    to: z.string().min(1, t('validation.selectCurrency')),
  }).refine(data => data.from !== data.to, {
    message: t('validation.differentCurrencies'),
    path: ["to"],
  });

type DisplayedPairManagerProps = {
    onAddPair: (from: string, to: string) => boolean;
    onRemovePair: (pair: string) => void;
    pairs: string[];
}

export function DisplayedPairManager({ onAddPair, onRemovePair, pairs: initialPairs }: DisplayedPairManagerProps) {
  const { currencies } = useCurrencies();
  const { t } = useTranslation();
  const [localPairs, setLocalPairs] = useState(initialPairs);

  const pairSchema = useMemo(() => getPairSchema(t), [t]);
  type PairFormValues = z.infer<typeof pairSchema>;

  const form = useForm<PairFormValues>({
    resolver: zodResolver(pairSchema),
    defaultValues: {
      from: 'USD',
      to: 'EUR',
    },
  });

  const handleSubmit = (data: PairFormValues) => {
    const success = onAddPair(data.from, data.to);
    if (success) {
      const newPair = `${data.from}/${data.to}`;
      if (!localPairs.includes(newPair)) {
        setLocalPairs(prev => [...prev, newPair]);
      }
      form.reset({ from: 'USD', to: 'EUR' });
    }
  }
  
  const handleRemove = (pair: string) => {
    onRemovePair(pair);
    setLocalPairs(prev => prev.filter(p => p !== pair));
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <List />
            {t('displayedPairManager.title')}
        </CardTitle>
        <CardDescription>{t('displayedPairManager.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex items-end gap-2">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-0">
                    <FormLabel>{t('tracking.from')}</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('tracking.from')}
                          disabled={currencies.length === 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex-1 min-w-0">
                    <FormLabel>{t('tracking.to')}</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('tracking.to')}
                          disabled={currencies.length === 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('displayedPairManager.addPair')}
            </Button>
          </form>
        </Form>
        {localPairs.length > 0 && (
            <>
                <Separator className="my-6" />
                <div className="space-y-2">
                    <h4 className="font-medium">{t('displayedPairManager.currentlyDisplayed')}</h4>
                    {localPairs.map(pair => (
                        <div key={pair} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span className="font-mono text-sm">{pair}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(pair)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
}
