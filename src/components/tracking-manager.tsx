'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, PlusCircle, Trash2, BellRing, Octagon } from 'lucide-react';
import { Separator } from './ui/separator';
import { useState, useMemo, useEffect } from 'react';
import { useCurrencies } from '@/hooks/use-currencies';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Alert } from '@/lib/types';

const getTrackingSchema = (t: (key: string, params?: Record<string, string | number>) => string) => z.object({
    from: z.string().min(1, t('validation.selectCurrency')),
    to: z.string().min(1, t('validation.selectCurrency')),
  }).refine(data => data.from !== data.to, {
    message: t('validation.differentCurrencies'),
    path: ["to"],
  });

type TrackingManagerProps = {
    onAddPair: (from: string, to: string) => Promise<boolean>;
    onRemovePair: (pair: string) => void;
    trackedPairs: string[];
    onIntervalChange: (seconds: number) => void;
    currentInterval: number;
}

export function TrackingManager({ onAddPair, onRemovePair, trackedPairs: initialTrackedPairs, onIntervalChange, currentInterval }: TrackingManagerProps) {
  const { currencies } = useCurrencies();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [localTrackedPairs, setLocalTrackedPairs] = useState(initialTrackedPairs);
  const [localInterval, setLocalInterval] = useState(currentInterval / 1000);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'notifications');
  }, [firestore, user]);
  
  const { data: cloudAlerts } = useCollection<Alert>(alertsQuery);

  useEffect(() => { setLocalTrackedPairs(initialTrackedPairs); }, [initialTrackedPairs]);

  const trackingSchema = useMemo(() => getTrackingSchema(t), [t]);
  type TrackingFormValues = z.infer<typeof trackingSchema>;

  const form = useForm<TrackingFormValues>({
    resolver: zodResolver(trackingSchema),
    defaultValues: { from: 'USD', to: 'EUR' },
  });

  const handleSubmit = async (data: TrackingFormValues) => {
    const success = await onAddPair(data.from, data.to);
    if (success) {
      const newPair = `${data.from}/${data.to}`;
      if (!localTrackedPairs.includes(newPair)) setLocalTrackedPairs(prev => [...prev, newPair]);
      form.reset({ from: 'USD', to: 'EUR' });
    }
  };
  
  const handleRemoveCloudAlert = async (id: string) => {
    if (user) {
      await deleteDoc(doc(firestore, 'users', user.uid, 'notifications', id));
      toast({ title: t('tracking.alertStopped') });
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2"><Eye />{t('tracking.title')}</CardTitle>
        <CardDescription>{t('tracking.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="flex items-end gap-2">
              <FormField control={form.control} name="from" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>{t('tracking.from')}</FormLabel><CurrencyCombobox value={field.value} onChange={field.onChange} disabled={currencies.length === 0} /></FormItem>
              )} />
              <FormField control={form.control} name="to" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>{t('tracking.to')}</FormLabel><CurrencyCombobox value={field.value} onChange={field.onChange} disabled={currencies.length === 0} /></FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />{t('tracking.addPair')}</Button>
          </form>
        </Form>

        {cloudAlerts && cloudAlerts.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-primary"><BellRing size={16} />{t('tracking.activeAlerts')}</h4>
              {cloudAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{alert.from}/{alert.to}</span>
                    <span className="text-[10px] text-muted-foreground">{alert.condition === 'above' ? '≥' : '≤'} {alert.threshold}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveCloudAlert(alert.id)} className="text-destructive h-8 px-2">
                    <Octagon className="mr-1 h-3 w-3" /> {t('tracking.stop')}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {localTrackedPairs.length > 0 && (
            <>
                <Separator className="my-6" />
                <div className="space-y-2">
                    <h4 className="font-medium">{t('tracking.currentlyTracking')}</h4>
                    {localTrackedPairs.map(pair => (
                        <div key={pair} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span className="font-mono text-sm">{pair}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemovePair(pair)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                    ))}
                </div>
            </>
        )}
      </CardContent>
    </Card>
  );
}
