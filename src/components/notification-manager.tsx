'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currencies } from '@/lib/currencies';
import { AlertTriangle, BellPlus } from 'lucide-react';

const alertSchema = z.object({
    from: z.string().min(1, "Please select a currency."),
    to: z.string().min(1, "Please select a currency."),
    threshold: z.coerce.number().positive("Threshold must be a positive number."),
    condition: z.enum(['above', 'below'], { required_error: "Please select a condition." })
  }).refine(data => data.from !== data.to, {
    message: "Currencies must be different.",
    path: ["to"],
  });

type AlertFormValues = z.infer<typeof alertSchema>;

type NotificationManagerProps = {
    onSetAlert: (data: AlertFormValues) => void;
}

export function NotificationManager({ onSetAlert }: NotificationManagerProps) {
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
            Set Price Alert
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

            <div className="flex items-end gap-2">
                <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                    <FormItem className="w-1/3">
                    <FormLabel>Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="above">Above</SelectItem>
                        <SelectItem value="below">Below</SelectItem>
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
                    <FormLabel>Threshold</FormLabel>
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
              Set Alert
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
