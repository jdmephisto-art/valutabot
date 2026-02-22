'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { getDynamicsForPeriod, getHistoricalRate, getDataSource } from '@/lib/currencies';
import { cn } from '@/lib/utils';
import { format, subDays, isAfter, startOfDay, addDays } from 'date-fns';
import { CalendarIcon, TrendingDown, TrendingUp, ArrowRightLeft, Info, AlertCircle, Share2 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useCurrencies } from '@/hooks/use-currencies';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';
import type { HistoricalRateResult } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { useTelegram } from '@/hooks/use-telegram';

export function HistoricalRates() {
  const dataSource = getDataSource();
  const { currencies } = useCurrencies();
  const { toast } = useToast();
  const { t, dateLocale, lang } = useTranslation();
  const firestore = useFirestore();
  const { share, haptic } = useTelegram();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [activeTab, setActiveTab] = useState('dynamics');

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [singleRate, setSingleRate] = useState<HistoricalRateResult | null | undefined>(undefined);
  const [fetchingSingle, setFetchingSingle] = useState(false);
  const [singleDatePopoverOpen, setSingleDatePopoverOpen] = useState(false);

  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeResult, setRangeResult] = useState<{ startRate: number; endRate: number } | null | undefined>(undefined);
  const [fetchingRange, setFetchingRange] = useState(false);
  const [rangeStartPopoverOpen, setRangeStartPopoverOpen] = useState(false);
  const [rangeEndPopoverOpen, setRangeEndPopoverOpen] = useState(false);

  const [dynamicsRange, setDynamicsRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 7), to: new Date() });
  const [dynamicsData, setDynamicsData] = useState<any[]>([]);
  const [fetchingDynamics, setFetchingDynamics] = useState(false);
  const [dynamicsStartPopoverOpen, setDynamicsStartPopoverOpen] = useState(false);
  const [dynamicsEndPopoverOpen, setDynamicsEndPopoverOpen] = useState(false);

  // Tomorrow is available for some sources
  const limit = addDays(startOfDay(new Date()), 1);

  const hasFutureDate = useMemo(() => {
    const isInvalid = (d: Date | undefined) => d ? isAfter(startOfDay(d), limit) : false;

    if (activeTab === 'single') return isInvalid(date);
    if (activeTab === 'dynamics') return isInvalid(dynamicsRange?.from) || isInvalid(dynamicsRange?.to);
    if (activeTab === 'range') return isInvalid(range?.from) || isInvalid(range?.to);
    return false;
  }, [activeTab, date, dynamicsRange, range, limit]);

  const numberFormatter = (val: number) => {
    if (val === 0) return '0';
    const options = { minimumFractionDigits: 2, maximumFractionDigits: 4 };
    return val.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', options);
  };

  const handleShareHistory = () => {
    haptic('medium');
    let shareText = '';

    if (activeTab === 'single' && singleRate && date) {
        shareText = t('history.shareTextSingle', {
            from: fromCurrency,
            to: toCurrency,
            date: format(date, "PPP", { locale: dateLocale }),
            rate: numberFormatter(singleRate.rate)
        });
    } else if (activeTab === 'range' && rangeResult && range?.from && range.to) {
        const change = (((rangeResult.endRate - rangeResult.startRate) / rangeResult.startRate) * 100).toFixed(2);
        shareText = t('history.shareTextRange', {
            from: fromCurrency,
            to: toCurrency,
            startRate: numberFormatter(rangeResult.startRate),
            endRate: numberFormatter(rangeResult.endRate),
            change,
            start: format(range.from, "MMM dd", { locale: dateLocale }),
            end: format(range.to, "MMM dd", { locale: dateLocale })
        });
    } else if (activeTab === 'dynamics' && dynamicsData.length > 0 && dynamicsRange?.from && dynamicsRange.to) {
        shareText = t('history.shareTextDynamics', {
            from: fromCurrency,
            to: toCurrency,
            start: format(dynamicsRange.from, "MMM dd", { locale: dateLocale }),
            end: format(dynamicsRange.to, "MMM dd", { locale: dateLocale })
        });
    }

    if (shareText) {
        share(shareText);
    }
  };

  const handleFetchDynamics = async () => {
    if (dynamicsRange?.from && dynamicsRange.to && !hasFutureDate) {
        setFetchingDynamics(true);
        setDynamicsData([]);
        try {
            const data = await getDynamicsForPeriod(fromCurrency, toCurrency, dynamicsRange.from, dynamicsRange.to);
            if (!data || data.length === 0) {
                toast({ variant: 'destructive', title: t('history.noDynamics'), description: t('history.dynamicFetchError') });
            } else {
                setDynamicsData(data);
            }
        } catch (e: any) {
            toast({ variant: 'destructive', title: t('history.noDynamics'), description: e.message });
        } finally {
            setFetchingDynamics(false);
        }
    }
  };

  const handleFetchSingleRate = async () => {
    if (date && !hasFutureDate) {
      setFetchingSingle(true);
      setSingleRate(undefined);
      try {
          const result = await getHistoricalRate(fromCurrency, toCurrency, date, firestore);
          if (!result) {
              setSingleRate(null);
              toast({ variant: 'destructive', title: t('history.noRate') });
          } else {
              setSingleRate(result);
          }
      } catch (e: any) {
          setSingleRate(null);
          toast({ variant: 'destructive', title: t('history.noRate'), description: e.message });
      } finally {
          setFetchingSingle(false);
      }
    }
  };

  const handleFetchRangeRate = async () => {
    if (range?.from && range.to && !hasFutureDate) {
      setFetchingRange(true);
      setRangeResult(undefined);
      try {
          const startRes = await getHistoricalRate(fromCurrency, toCurrency, range.from, firestore);
          const endRes = await getHistoricalRate(fromCurrency, toCurrency, range.to, firestore);
          if (startRes && endRes) {
            setRangeResult({ startRate: startRes.rate, endRate: endRes.rate });
          } else {
            setRangeResult(null);
            toast({ variant: 'destructive', title: t('history.noRate') });
          }
      } catch (e: any) {
          setRangeResult(null);
          toast({ variant: 'destructive', title: t('history.noRate'), description: e.message });
      } finally {
          setFetchingRange(false);
      }
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSingleRate(undefined);
    setRangeResult(undefined);
    setDynamicsData([]);
  }

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setSingleRate(undefined);
    setRangeResult(undefined);
    setDynamicsData([]);
  }

  const chartConfig = { 
    rate: { 
      label: t('history.dynamicsFor', { from: fromCurrency, to: toCurrency }), 
      color: 'hsl(var(--primary))' 
    } 
  };

  const canShare = (activeTab === 'single' && singleRate) || 
                   (activeTab === 'range' && rangeResult) || 
                   (activeTab === 'dynamics' && dynamicsData.length > 0);

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex-1">
          <CardTitle className="text-lg font-semibold">{t('history.title')}</CardTitle>
          <CardDescription>{t('history.description', { source: dataSource.toUpperCase() })}</CardDescription>
        </div>
        {canShare && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-primary"
                onClick={handleShareHistory}
                title={t('history.share')}
            >
                <Share2 className="h-5 w-5" />
            </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 min-w-0">
              <CurrencyCombobox value={fromCurrency} onChange={setFromCurrency} />
          </div>
          <Button variant="ghost" size="icon" onClick={handleSwapCurrencies} className="flex-shrink-0">
             <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="flex-1 min-w-0">
              <CurrencyCombobox value={toCurrency} onChange={setToCurrency} />
          </div>
        </div>

        <Tabs defaultValue="dynamics" value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dynamics">{t('history.tabDynamics')}</TabsTrigger>
            <TabsTrigger value="single">{t('history.tabSingle')}</TabsTrigger>
            <TabsTrigger value="range">{t('history.tabRange')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dynamics" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
                <Popover open={dynamicsStartPopoverOpen} onOpenChange={setDynamicsStartPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal px-2">
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{dynamicsRange?.from ? format(dynamicsRange.from, "MMM dd, yy", { locale: dateLocale }) : t('history.startDate')}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={dynamicsRange?.from} 
                          onSelect={(d) => { setDynamicsRange({ ...dynamicsRange, from: d }); setDynamicsStartPopoverOpen(false); }} 
                          locale={dateLocale}
                          disabled={(date) => isAfter(startOfDay(date), limit)}
                        />
                    </PopoverContent>
                </Popover>
                <Popover open={dynamicsEndPopoverOpen} onOpenChange={setDynamicsEndPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal px-2">
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{dynamicsRange?.to ? format(dynamicsRange.to, "MMM dd, yy", { locale: dateLocale }) : t('history.endDate')}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={dynamicsRange?.to} 
                          onSelect={(d) => { setDynamicsRange({ ...dynamicsRange, to: d }); setDynamicsEndPopoverOpen(false); }} 
                          locale={dateLocale}
                          disabled={(date) => isAfter(startOfDay(date), limit)}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            
            {hasFutureDate && (
              <Alert variant="destructive" className="py-2 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('history.futureDate')}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleFetchDynamics} className="w-full" disabled={fetchingDynamics || !dynamicsRange?.from || !dynamicsRange?.to || hasFutureDate}>{fetchingDynamics ? t('latestRates.loading') : t('history.showDynamics')}</Button>
            {dynamicsData.length > 0 && (
                <div className="h-[250px] w-full pt-4">
                    <ChartContainer config={chartConfig}>
                        <AreaChart data={dynamicsData} margin={{ left: 45, right: 10, top: 10, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tickMargin={8} 
                                tickFormatter={numberFormatter} 
                                width={60}
                                domain={['dataMin', 'dataMax']}
                            />
                            <ChartTooltip content={<ChartTooltipContent formatter={(value) => numberFormatter(Number(value))} />} />
                            <Area dataKey="rate" type="monotone" fill="var(--color-rate)" stroke="var(--color-rate)" fillOpacity={0.4} />
                        </AreaChart>
                    </ChartContainer>
                </div>
            )}
          </TabsContent>

          <TabsContent value="single" className="space-y-4 pt-4">
            <Popover open={singleDatePopoverOpen} onOpenChange={setSingleDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: dateLocale }) : t('history.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                  <Calendar 
                    mode="single" 
                    selected={date} 
                    onSelect={(d) => { setDate(d); setSingleDatePopoverOpen(false); }} 
                    locale={dateLocale}
                    disabled={(date) => isAfter(startOfDay(date), limit)}
                  />
              </PopoverContent>
            </Popover>

            {hasFutureDate && (
              <Alert variant="destructive" className="py-2 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('history.futureDate')}
                </AlertDescription>
              </Alert>
            )}

            <Button onClick={handleFetchSingleRate} className="w-full" disabled={fetchingSingle || !date || hasFutureDate}>{fetchingSingle ? t('latestRates.loading') : t('history.getRate')}</Button>
            {singleRate !== undefined && singleRate !== null && (
              <div className="text-center p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm text-muted-foreground">{t('history.rateOn', { date: date ? format(date, "PPP", { locale: dateLocale }) : '' })}</p>
                <p className="text-2xl font-bold font-mono">{numberFormatter(singleRate.rate)}</p>
                {singleRate.isFallback && (
                    <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/20 rounded text-left mt-2">
                        <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-orange-600 leading-tight">
                            {t('history.fallbackHint', { 
                                requestedDate: date ? format(date, "dd.MM.yyyy") : '', 
                                actualDate: format(singleRate.date, "dd.MM.yyyy") 
                            })}
                        </p>
                    </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="range" className="space-y-4 pt-4">
             <div className="grid grid-cols-2 gap-2">
                <Popover open={rangeStartPopoverOpen} onOpenChange={setRangeStartPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal px-2">
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{range?.from ? format(range.from, "MMM dd, yy", { locale: dateLocale }) : t('history.startDate')}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={range?.from} 
                          onSelect={(d) => { setRange({ ...range, from: d }); setRangeStartPopoverOpen(false); }} 
                          locale={dateLocale}
                          disabled={(date) => isAfter(startOfDay(date), limit)}
                        />
                    </PopoverContent>
                </Popover>
                <Popover open={rangeEndPopoverOpen} onOpenChange={setRangeEndPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal px-2">
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">{range?.to ? format(range.to, "MMM dd, yy", { locale: dateLocale }) : t('history.endDate')}</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                          mode="single" 
                          selected={range?.to} 
                          onSelect={(d) => { setRange({ ...range, to: d }); setRangeEndPopoverOpen(false); }} 
                          locale={dateLocale}
                          disabled={(date) => isAfter(startOfDay(date), limit)}
                        />
                    </PopoverContent>
                </Popover>
             </div>

             {hasFutureDate && (
              <Alert variant="destructive" className="py-2 px-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('history.futureDate')}
                </AlertDescription>
              </Alert>
            )}

             <Button onClick={handleFetchRangeRate} className="w-full" disabled={fetchingRange || !range?.from || !range?.to || hasFutureDate}>{fetchingRange ? t('latestRates.loading') : t('history.compareRates')}</Button>
             {rangeResult && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{t('history.start', { date: range?.from ? format(range.from, "LLL dd", { locale: dateLocale }) : '' })}</span><span className="font-mono font-medium">{numberFormatter(rangeResult.startRate)}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">{t('history.end', { date: range?.to ? format(range.to, "LLL dd", { locale: dateLocale }) : '' })}</span><span className="font-mono font-medium">{numberFormatter(rangeResult.endRate)}</span></div>
                    <div className="flex justify-between items-center pt-2 border-t"><span className="text-sm font-semibold">{t('history.change')}</span><span className={cn("font-semibold flex items-center gap-1", rangeResult.endRate >= rangeResult.startRate ? 'text-positive' : 'text-negative')}>{rangeResult.endRate >= rangeResult.startRate ? <TrendingUp size={16} /> : <TrendingDown size={16} />}{(((rangeResult.endRate - rangeResult.startRate) / rangeResult.startRate) * 100).toFixed(2)}%</span></div>
                </div>
             )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
