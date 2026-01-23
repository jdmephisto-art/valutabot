'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { useState } from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { CurrencyCombobox } from './currency-combobox';

const trackingSchema = z.object({
    from: z.string().min(1, 'Пожалуйста, выберите валюту.'),
    to: z.string().min(1, 'Пожалуйста, выберите валюту.'),
  }).refine(data => data.from !== data.to, {
    message: 'Валюты должны быть разными.',
    path: ["to"],
  });

type TrackingFormValues = z.infer<typeof trackingSchema>;

type TrackingManagerProps = {
    onAddPair: (from: string, to: string) => boolean;
    onRemovePair: (pair: string) => void;
    trackedPairs: string[];
}

export function TrackingManager({ onAddPair, onRemovePair, trackedPairs: initialTrackedPairs }: TrackingManagerProps) {
  const { currencies } = useCurrencies();
  const [localTrackedPairs, setLocalTrackedPairs] = useState(initialTrackedPairs);

  const form = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: {
      from: 'USD',
      to: 'EUR',
    },
  });

  const handleSubmit = (data: TrackingFormValues) => {
    const success = onAddPair(data.from, data.to);
    if (success) {
      const newPair = `${data.from}/${data.to}`;
      if (!localTrackedPairs.includes(newPair)) {
        setLocalTrackedPairs(prev => [...prev, newPair]);
      }
      form.reset();
    }
  }
  
  const handleRemove = (pair: string) => {
    onRemovePair(pair);
    setLocalTrackedPairs(prev => prev.filter(p => p !== pair));
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Eye />
            Отслеживание валютных пар
        </CardTitle>
        <CardDescription>Получайте уведомления в чате при изменении курса.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex items-end gap-2">
              <FormField
                control={form.control}
                name="from"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Из</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='Из'
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
                  <FormItem className="flex-1">
                    <FormLabel>В</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder='В'
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
              Добавить пару
            </Button>
          </form>
        </Form>
        {localTrackedPairs.length > 0 && (
            <>
                <Separator className="my-6" />
                <div className="space-y-2">
                    <h4 className="font-medium">Сейчас отслеживается</h4>
                    {localTrackedPairs.map(pair => (
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
