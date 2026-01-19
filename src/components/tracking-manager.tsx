
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currencies } from '@/lib/currencies';
import { Eye, PlusCircle, Trash2 } from 'lucide-react';
import { Separator } from './ui/separator';
import { useState } from 'react';

const trackingSchema = z.object({
    from: z.string().min(1, "Please select a currency."),
    to: z.string().min(1, "Please select a currency."),
  }).refine(data => data.from !== data.to, {
    message: "Currencies must be different.",
    path: ["to"],
  });

type TrackingFormValues = z.infer<typeof trackingSchema>;

type TrackingManagerProps = {
    onAddPair: (from: string, to: string) => boolean;
    onRemovePair: (pair: string) => void;
    trackedPairs: string[];
}

export function TrackingManager({ onAddPair, onRemovePair, trackedPairs: initialTrackedPairs }: TrackingManagerProps) {
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
            Track Currency Pairs
        </CardTitle>
        <CardDescription>Get notified in the chat when a rate changes.</CardDescription>
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
                    <FormLabel>From</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="to"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Pair
            </Button>
          </form>
        </Form>
        {localTrackedPairs.length > 0 && (
            <>
                <Separator className="my-6" />
                <div className="space-y-2">
                    <h4 className="font-medium">Currently Tracking</h4>
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
