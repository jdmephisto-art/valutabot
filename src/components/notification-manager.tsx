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
import { useTranslation } from '@/hooks/use-translation';
import { useMemo } from 'react';

const createAlertSchema = (t: (key: any) => string) => z.object({
    from: z.string().min(1, t('notification.error.selectCurrency')),
    to: z.string().min(1, t('notification.error.selectCurrency')),
    threshold: z.coerce.number().positive(t('notification.error.positiveThreshold')),
    condition: z.enum(['above', 'below'], { required_error: t('notification.error.selectCondition') })
  }).refine(data => data.from !== data.to, {
    message: t('notification.error.differentCurrencies'),
    path: ["to"],
  });

type AlertFormValues = z.infer<ReturnType<typeof createAlertSchema>>;

type NotificationManagerProps = {
    onSetAlert: (data: AlertFormValues) => void;
}

export function NotificationManager({ onSetAlert }: NotificationManagerProps) {
  const { t } = useTranslation();
  const { currencies } = useCurrencies();

  const alertSchema = useMemo(() => createAlertSchema(t), [t]);

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
            {t('notification.title')}
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
                    <FormLabel>{t('notification.from')}</FormLabel>
                    <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('notification.from')}
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
                    <FormLabel>{t('notification.to')}</FormLabel>
                     <FormControl>
                      <CurrencyCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('notification.to')}
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
                    <FormLabel>{t('notification.condition')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="above">{t('notification.condition.above')}</SelectItem>
                        <SelectItem value="below">{t('notification.condition.below')}</SelectItem>
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
                    <FormLabel>{t('notification.threshold')}</FormLabel>
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
              {t('notification.setAlert')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
