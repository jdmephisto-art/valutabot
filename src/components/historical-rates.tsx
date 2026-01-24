
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { getDynamicsForPeriod, getHistoricalRate, getDataSource } from '@/lib/currencies';
import { cn } from '@/lib/utils';
import { format, subDays, differenceInDays } from 'date-fns';
import { CalendarIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { useCurrencies } from '@/hooks/use-currencies';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { CurrencyCombobox } from './currency-combobox';


export function HistoricalRates() {
  const { currencies } = useCurrencies();
  const { toast } = useToast();
  const { t, lang, dateLocale } = useTranslation();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [activeTab, setActiveTab] = useState('dynamics');

  // State for single date
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [singleRate, setSingleRate] = useState<number | null | undefined>(undefined);
  const [fetchingSingle, setFetchingSingle] = useState(false);

  // State for date range
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeResult, setRangeResult] = useState<{ startRate: number; endRate: number } | null | undefined>(undefined);
  const [fetchingRange, setFetchingRange] = useState(false);

  // State for historical dynamics
  const [dynamicsRange, setDynamicsRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 29), to: new Date() });
  const [dynamicsData, setDynamicsData] = useState<any[]>([]);
  const [fetchingDynamics, setFetchingDynamics] = useState(false);

  const handleFetchDynamics = async () => {
    if (dynamicsRange?.from && dynamicsRange.to) {
        setFetchingDynamics(true);
        setDynamicsData([]);
        const data = await getDynamicsForPeriod(fromCurrency, toCurrency, dynamicsRange.from, dynamicsRange.to);
        setDynamicsData(data);
        setFetchingDynamics(false);
    }
  };

  const handleFetchSingleRate = async () => {
    if (date) {
      setFetchingSingle(true);
      setSingleRate(undefined);
      const rate = await getHistoricalRate(fromCurrency, toCurrency, date);
      setSingleRate(rate === undefined ? null : rate);
      setFetchingSingle(false);
    }
  };

  const handleFetchRangeRate = async () => {
    if (range?.from && range.to) {
      setFetchingRange(true);
      setRangeResult(undefined);
      const startRate = await getHistoricalRate(fromCurrency, toCurrency, range.from);
      const endRate = await getHistoricalRate(fromCurrency, toCurrency, range.to);
      if (startRate !== undefined && endRate !== undefined) {
        setRangeResult({ startRate, endRate });
      } else {
        setRangeResult(null);
      }
      setFetchingRange(false);
    }
  };
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSingleRate(undefined);
    setRangeResult(undefined);
    setDynamicsData([]);
  }

  const handleDynamicsRangeSelect = (range: DateRange | undefined) => {
    if (getDataSource() === 'currencyapi' && range?.from && range.to && differenceInDays(range.to, range.from) > 30) {
        toast({
            variant: 'destructive',
            title: t('history.rangeTooLarge'),
            description: t('history.rangeTooLargeDesc')
        });
        return;
    }
    setDynamicsRange(range);
  }

  const getCalendarDisabledDates = () => {
    const disabled: { before?: Date, after?: Date } = { after: new Date() };
    if (getDataSource() === 'nbrb') {
        disabled.before = new Date('2021-01-01');
    }
    return disabled;
  }


  const renderCurrencySelects = () => (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex-1 min-w-0">
        <CurrencyCombobox
          value={fromCurrency}
          onChange={setFromCurrency}
          placeholder={t('converter.from')}
          disabled={currencies.length === 0}
        />
      </div>
      <div className="flex-1 min-w-0">
        <CurrencyCombobox
          value={toCurrency}
          onChange={setToCurrency}
          placeholder={t('converter.to')}
          disabled={currencies.length === 0}
        />
      </div>
    </div>
  );
  
  const chartConfig = {
    rate: { label: 'Rate', color: 'hsl(var(--primary))' },
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{t('history.title')}</CardTitle>
        <CardDescription>{t('history.description', { source: getDataSource().toUpperCase() })}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dynamics" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dynamics">{t('history.tabDynamics')}</TabsTrigger>
            <TabsTrigger value="single">{t('history.tabSingle')}</TabsTrigger>
            <TabsTrigger value="range">{t('history.tabRange')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dynamics" className="space-y-4 pt-4">
            {renderCurrencySelects()}
            <div className="grid grid-cols-2 gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dynamicsRange?.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dynamicsRange?.from ? format(dynamicsRange.from, "LLL dd, y", { locale: dateLocale }) : <span>{t('history.startDate')}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="single"
                            selected={dynamicsRange?.from}
                            onSelect={(day) => handleDynamicsRangeSelect({ ...dynamicsRange, from: day })}
                            disabled={(date) => (dynamicsRange?.to ? date > dynamicsRange.to : false) || (getCalendarDisabledDates().before ? date < getCalendarDisabledDates().before! : false) || (getCalendarDisabledDates().after ? date > getCalendarDisabledDates().after! : false)}
                            locale={dateLocale}
                        />
                    </PopoverContent>
                </Popover>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dynamicsRange?.to && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dynamicsRange?.to ? format(dynamicsRange.to, "LLL dd, y", { locale: dateLocale }) : <span>{t('history.endDate')}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="single"
                            selected={dynamicsRange?.to}
                            onSelect={(day) => handleDynamicsRangeSelect({ ...dynamicsRange, to: day })}
                            disabled={(date) => (dynamicsRange?.from ? date < dynamicsRange.from : false) || (getCalendarDisabledDates().before ? date < getCalendarDisabledDates().before! : false) || (getCalendarDisabledDates().after ? date > getCalendarDisabledDates().after! : false)}
                            locale={dateLocale}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <Button onClick={handleFetchDynamics} className="w-full" disabled={fetchingDynamics || !dynamicsRange?.from || !dynamicsRange?.to}>
                {fetchingDynamics ? t('latestRates.loading') : t('history.showDynamics')}
            </Button>
            {dynamicsData.length > 0 && (
                <div className="h-[250px] w-full">
                    <p className="text-xs text-center text-muted-foreground pb-2">{t('history.dynamicsFor', { from: fromCurrency, to: toCurrency })}</p>
                    <ChartContainer config={chartConfig}>
                        <AreaChart accessibilityLayer data={dynamicsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                             <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval={'preserveStartEnd'} tickFormatter={(value, index) => {
                                 if (dynamicsData.length > 30) {
                                     // Show fewer ticks for large ranges
                                    if (index % Math.floor(dynamicsData.length / 10) === 0) return value;
                                    return '';
                                 }
                                 return value;
                             }}/>
                             <YAxis domain={['dataMin - (dataMax - dataMin) * 0.1', 'dataMax + (dataMax - dataMin) * 0.1']} tickLine={false} axisLine={false} tickMargin={8} tickCount={3} tickFormatter={(value) => typeof value === 'number' ? value.toFixed(4) : ''} />
                            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                            <Area dataKey="rate" type="natural" fill="var(--color-rate)" fillOpacity={0.4} stroke="var(--color-rate)" />
                        </AreaChart>
                    </ChartContainer>
                </div>
            )}
             {!fetchingDynamics && dynamicsData.length === 0 && activeTab === 'dynamics' && <p className="text-xs text-center text-muted-foreground pt-2">{t('history.noDynamics')}</p>}
          </TabsContent>

          <TabsContent value="single" className="space-y-4 pt-4">
            {renderCurrencySelects()}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: dateLocale }) : <span>{t('history.selectDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={getCalendarDisabledDates()} locale={dateLocale} /></PopoverContent>
            </Popover>
            <Button onClick={handleFetchSingleRate} className="w-full" disabled={fetchingSingle || !date}>
                {fetchingSingle ? t('latestRates.loading') : t('history.getRate')}
            </Button>
            {singleRate !== null && singleRate !== undefined && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">{t('history.rateOn', { date: date ? format(date, "PPP", { locale: dateLocale }) : '' })}</p>
                <p className="text-2xl font-bold font-mono">{singleRate.toFixed(4)}</p>
              </div>
            )}
             {singleRate === null && <p className="text-xs text-center text-muted-foreground pt-2">{t('history.noRate')}</p>}
          </TabsContent>

          <TabsContent value="range" className="space-y-4 pt-4">
             {renderCurrencySelects()}
             <div className="grid grid-cols-2 gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="start-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !range?.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {range?.from ? format(range.from, "LLL dd, y", { locale: dateLocale }) : <span>{t('history.startDate')}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                            initialFocus 
                            mode="single" 
                            selected={range?.from} 
                            onSelect={(day) => setRange(prev => ({ ...prev, from: day }))}
                            disabled={(date) => (range?.to ? date > range.to : false) || (getCalendarDisabledDates().before ? date < getCalendarDisabledDates().before! : false) || (getCalendarDisabledDates().after ? date > getCalendarDisabledDates().after! : false)}
                            locale={dateLocale}
                        />
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="end-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !range?.to && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {range?.to ? format(range.to, "LLL dd, y", { locale: dateLocale }) : <span>{t('history.endDate')}</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                            initialFocus 
                            mode="single" 
                            selected={range?.to} 
                            onSelect={(day) => setRange(prev => ({ ...prev, to: day }))}
                            disabled={(date) => (range?.from ? date < range.from : false) || (getCalendarDisabledDates().before ? date < getCalendarDisabledDates().before! : false) || (getCalendarDisabledDates().after ? date > getCalendarDisabledDates().after! : false)}
                            locale={dateLocale}
                        />
                    </PopoverContent>
                </Popover>
             </div>
             <Button onClick={handleFetchRangeRate} className="w-full" disabled={fetchingRange || !range?.from || !range?.to}>
                {fetchingRange ? t('latestRates.loading') : t('history.compareRates')}
            </Button>
             {rangeResult && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('history.start', { date: range?.from ? format(range.from, "LLL dd", { locale: dateLocale }) : '' })}</span>
                        <span className="font-mono font-medium">{rangeResult.startRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('history.end', { date: range?.to ? format(range.to, "LLL dd", { locale: dateLocale }) : '' })}</span>
                        <span className="font-mono font-medium">{rangeResult.endRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm font-semibold">{t('history.change')}</span>
                        <span className={cn("font-semibold flex items-center gap-1", rangeResult.endRate >= rangeResult.startRate ? 'text-positive' : 'text-negative')}>
                            {rangeResult.endRate >= rangeResult.startRate ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {(((rangeResult.endRate - rangeResult.startRate) / rangeResult.startRate) * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>
             )}
             {rangeResult === null && <p className="text-xs text-center text-muted-foreground pt-2">{t('history.noRate')}</p>}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
