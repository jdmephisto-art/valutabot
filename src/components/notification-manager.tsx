
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, BellPlus, Send, Info } from 'lucide-react';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { useMemo } from 'react';
import { CurrencyCombobox } from './currency-combobox';

type NotificationManagerProps = {
    onSetAlert: (data: z.infer<ReturnType<typeof getAlertSchema>>) => void;
    isTelegramAvailable?: boolean;
}

const getAlertSchema = (t: (key: string, params?: Record<string, string | number>) => string) => z.object({
    from: z.string().min(1, t('validation.selectCurrency')),
    to: z.string().min(1, t('validation.selectCurrency')),
    threshold: z.coerce.number().positive(t('validation.positiveThreshold')),
    condition: z.enum(['above', 'below'], { required_error: t('validation.selectCondition') }),
    sendToTelegram: z.boolean().default(false),
  }).refine(data => data.from !== data.to, {
    message: t('validation.differentCurrencies'),
    path: ["to"],
  });


export function NotificationManager({ onSetAlert, isTelegramAvailable }: NotificationManagerProps) {
  const { currencies } = useCurrencies();
  const { t, lang } = useTranslation();

  const alertSchema = useMemo(() => getAlertSchema(t), [t]);
  type AlertFormValues = z.infer<typeof alertSchema>;

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      from: 'USD',
      to: 'BYN',
      condition: 'above',
      threshold: 1,
      sendToTelegram: false,
    },
  });

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="text-primary" />
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
                          placeholder="0.95" 
                          {...field} 
                          value={field.value ?? ''} 
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="space-y-2">
              <FormField
                control={form.control}
                name="sendToTelegram"
                render={({ field }) => (
                  <FormItem className={cn(
                    "flex flex-row items-center justify-between rounded-lg border p-3 transition-colors",
                    !isTelegramAvailable ? "opacity-50 bg-muted/50 cursor-not-allowed" : "bg-primary/5 border-primary/10"
                  )}>
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-bold flex items-center gap-2">
                        <Send className={cn("h-3 w-3", isTelegramAvailable ? "text-primary" : "text-muted-foreground")} />
                        {t('notifications.sendToTelegram')}
                      </FormLabel>
                      <FormDescription className="text-[10px]">
                        {t('notifications.sendToTelegramDesc')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!isTelegramAvailable}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              {!isTelegramAvailable && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <Info className="h-3 w-3 text-amber-600 shrink-0" />
                  <p className="text-[9px] text-amber-700 leading-tight">
                    {lang === 'ru' 
                      ? 'Функция доступна только внутри Telegram-бота. Откройте ВалютаБот в мессенджере.' 
                      : 'This feature is only available inside the Telegram bot.'}
                  </p>
                </div>
              )}
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
