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
import { useTranslation } from '@/hooks/use-translation';
import { useMemo } from 'react';
import { CurrencyCombobox } from './currency-combobox';

type NotificationManagerProps = {
    onSetAlert: (data: z.infer<ReturnType<typeof getAlertSchema>>) => void;
}

const getAlertSchema = (t: (key: string, params?: Record<string, string | number>) => string) => z.object({
    from: z.string().min(1, t('validation.selectCurrency')),
    to: z.string().min(1, t('validation.selectCurrency')),
    threshold: z.coerce.number().positive(t('validation.positiveThreshold')),
    condition: z.enum(['above', 'below'], { required_error: t('validation.selectCondition') })
  }).refine(data => data.from !== data.to, {
    message: t('validation.differentCurrencies'),
    path: ["to"],
  });


export function NotificationManager({ onSetAlert }: NotificationManagerProps) {
  const { currencies } = useCurrencies();
  const { t } = useTranslation();

  const alertSchema = useMemo(() => getAlertSchema(t), [t]);
  type AlertFormValues = z.infer<typeof alertSchema>;

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      from: 'USD',
      to: 'EUR',
      condition: 'above',
      threshold: 1,
    },
  });

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle />
            {t('notifications.title')}
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
                  <FormItem className="flex-1 min-w-0">
                    <FormLabel>{t('notifications.from')}</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('notifications.from')}
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
                    <FormLabel>{t('notifications.to')}</FormLabel>
                     <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('notifications.to')}
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
                    <FormLabel>{t('notifications.condition')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="above">{t('notifications.above')}</SelectItem>
                        <SelectItem value="below">{t('notifications.below')}</SelectItem>
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
                    <FormLabel>{t('notifications.threshold')}</FormLabel>
                    <FormControl>
                        <Input 
                          type="number" 
                          step="0.0001" 
                          placeholder="e.g., 0.95" 
                          {...field} 
                          value={field.value ?? ''} // Гарантируем, что value никогда не undefined
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <Button type="submit" className="w-full">
              <BellPlus className="mr-2 h-4 w-4" />
              {t('notifications.button')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
