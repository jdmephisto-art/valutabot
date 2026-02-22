'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Timer } from 'lucide-react';
import { useTranslation } from '@/hooks/use-translation';
import { useMemo } from 'react';

type AutoClearManagerProps = {
    onSetAutoClear: (minutes: number) => void;
    currentMinutes: number;
}

const getAutoClearSchema = (t: (key: string, params?: Record<string, string | number>) => string) => z.object({
    minutes: z.coerce.number().int().min(0, t('validation.positiveOrZero')),
});

export function AutoClearManager({ onSetAutoClear, currentMinutes }: AutoClearManagerProps) {
  const { t } = useTranslation();

  const autoClearSchema = useMemo(() => getAutoClearSchema(t), [t]);
  type AutoClearFormValues = z.infer<typeof autoClearSchema>;

  const form = useForm<AutoClearFormValues>({
    resolver: zodResolver(autoClearSchema),
    defaultValues: {
      minutes: currentMinutes,
    },
  });

  const handleSubmit = (data: AutoClearFormValues) => {
    onSetAutoClear(data.minutes);
  }

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Timer />
            {t('autoClear.title')}
        </CardTitle>
        <CardDescription>{t('autoClear.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('autoClear.minutes')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              {t('autoClear.button')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
