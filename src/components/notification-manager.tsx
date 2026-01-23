'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, BellPlus } from 'lucide-react';
import { useCurrencies } from '@/hooks/use-currencies';
import { CurrencyCombobox } from './currency-combobox';

const alertSchema = z.object({
    from: z.string().min(1, 'Пожалуйста, выберите валюту.'),
    to: z.string().min(1, 'Пожалуйста, выберите валюту.'),
    threshold: z.coerce.number().positive('Порог должен быть положительным числом.'),
    condition: z.enum(['above', 'below'], { required_error: 'Пожалуйста, выберите условие.' })
  }).refine(data => data.from !== data.to, {
    message: 'Валюты должны быть разными.',
    path: ["to"],
  });

type AlertFormValues = z.infer<typeof alertSchema>;

type NotificationManagerProps = {
    onSetAlert: (data: AlertFormValues) => void;
}

export function NotificationManager({ onSetAlert }: NotificationManagerProps) {
  const { currencies } = useCurrencies();

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      from: 'USD',
      to: 'EUR',
      condition: 'above',
    },
  });

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle />
            Установить оповещение о курсе
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSetAlert)} className="space-y-6">
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

            <div className="flex items-end gap-2">
                <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                    <FormItem className="w-1/3">
                    <FormLabel>Условие</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="above">Выше</SelectItem>
                        <SelectItem value="below">Ниже</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="threshold"
                render={({ field }) => (
                    <FormItem className="flex-1">
                    <FormLabel>Порог</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.0001" placeholder="e.g., 0.95" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Button type="submit" className="w-full">
              <BellPlus className="mr-2 h-4 w-4" />
              Установить оповещение
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
