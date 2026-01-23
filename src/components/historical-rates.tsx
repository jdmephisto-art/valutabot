'use client';

import { useState } from 'react';
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
import { CurrencyCombobox } from './currency-combobox';


export function HistoricalRates() {
  const { currencies } = useCurrencies();
  const { toast } = useToast();
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');

  // State for single date
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [singleRate, setSingleRate] = useState<number | null>(null);

  // State for date range
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeResult, setRangeResult] = useState<{ startRate: number; endRate: number } | null>(null);

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
      setSingleRate(null);
      const rate = await getHistoricalRate(fromCurrency, toCurrency, date);
      setSingleRate(rate === undefined ? null : rate);
    }
  };

  const handleFetchRangeRate = async () => {
    if (range?.from && range.to) {
      setRangeResult(null);
      const startRate = await getHistoricalRate(fromCurrency, toCurrency, range.from);
      const endRate = await getHistoricalRate(fromCurrency, toCurrency, range.to);
      if (startRate !== undefined && endRate !== undefined) {
        setRangeResult({ startRate, endRate });
      } else {
        setRangeResult(null);
      }
    }
  };

  const handleDynamicsRangeSelect = (range: DateRange | undefined) => {
    if (getDataSource() === 'currencyapi' && range?.from && range.to && differenceInDays(range.to, range.from) > 30) {
        toast({
            variant: 'destructive',
            title: 'Date range too large',
            description: 'Please select a range of 30 days or less for CurrencyAPI to avoid exceeding API limits.'
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
      <CurrencyCombobox
        value={fromCurrency}
        onChange={setFromCurrency}
        placeholder="From"
        disabled={currencies.length === 0}
      />
      <CurrencyCombobox
        value={toCurrency}
        onChange={setToCurrency}
        placeholder="To"
        disabled={currencies.length === 0}
      />
    </div>
  );
  
  const chartConfig = {
    rate: { label: 'Rate', color: 'hsl(var(--primary))' },
  };

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Historical Data</CardTitle>
        <CardDescription>Data from {getDataSource().toUpperCase()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dynamics">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dynamics">Dynamics</TabsTrigger>
            <TabsTrigger value="single">Single Date</TabsTrigger>
            <TabsTrigger value="range">Range</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dynamics" className="space-y-4 pt-4">
            {renderCurrencySelects()}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dynamicsRange && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dynamicsRange?.from ? (dynamicsRange.to ? <>{format(dynamicsRange.from, "LLL dd, y")} - {format(dynamicsRange.to, "LLL dd, y")}</> : format(dynamicsRange.from, "LLL dd, y")) : <span>Pick a date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                    initialFocus 
                    mode="range" 
                    defaultMonth={dynamicsRange?.from} 
                    selected={dynamicsRange} 
                    onSelect={handleDynamicsRangeSelect} 
                    numberOfMonths={2} 
                    disabled={getCalendarDisabledDates()}
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleFetchDynamics} className="w-full" disabled={fetchingDynamics}>
                {fetchingDynamics ? 'Loading...' : 'Show Dynamics'}
            </Button>
            {dynamicsData.length > 0 && (
                <div className="h-[250px] w-full">
                    <p className="text-xs text-center text-muted-foreground pb-2">Rate dynamics for {fromCurrency}/{toCurrency}</p>
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
             {!fetchingDynamics && dynamicsData.length === 0 && <p className="text-xs text-center text-muted-foreground pt-2">Could not fetch dynamics for the selected period. Select another date range.</p>}
          </TabsContent>

          <TabsContent value="single" className="space-y-4 pt-4">
            {renderCurrencySelects()}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={getCalendarDisabledDates()} /></PopoverContent>
            </Popover>
            <Button onClick={handleFetchSingleRate} className="w-full">Get Rate</Button>
            {singleRate !== null && singleRate !== undefined && (
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Rate on {date ? format(date, "PPP") : ''}</p>
                <p className="text-2xl font-bold font-mono">{singleRate.toFixed(4)}</p>
              </div>
            )}
             {(singleRate === null || singleRate === undefined) && <p className="text-xs text-center text-muted-foreground">Could not fetch rate for the selected date.</p>}
          </TabsContent>

          <TabsContent value="range" className="space-y-4 pt-4">
             {renderCurrencySelects()}
             <div className="grid grid-cols-2 gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button id="start-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !range?.from && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {range?.from ? format(range.from, "LLL dd, y") : <span>Start date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                            initialFocus 
                            mode="single" 
                            selected={range?.from} 
                            onSelect={(day) => setRange(currentRange => ({ from: day, to: currentRange?.to }))}
                            disabled={(date) => (range?.to ? date > range.to : false) || (getCalendarDisabledDates().before ? date < getCalendarDisabledDates().before! : false) || (getCalendarDisabledDates().after ? date > getCalendarDisabledDates().after! : false)}
                        />
                    </PopoverContent>
                </Popover>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button id="end-date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !range?.to && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {range?.to ? format(range.to, "LLL dd, y") : <span>End date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar 
                            initialFocus 
                            mode="single" 
                            selected={range?.to} 
                            onSelect={(day) => setRange(currentRange => ({ from: currentRange?.from, to: day }))}
                            disabled={(date) => (range?.from ? date < range.from : false) || (getCalendarDisabledDates().before ? date < getCalendarDisabledDates().before! : false) || (getCalendarDisabledDates().after ? date > getCalendarDisabledDates().after! : false)}
                        />
                    </PopoverContent>
                </Popover>
             </div>
             <Button onClick={handleFetchRangeRate} className="w-full" disabled={!range?.from || !range?.to}>Compare Rates</Button>
             {rangeResult && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Start ({range?.from ? format(range.from, "LLL dd") : ''}):</span>
                        <span className="font-mono font-medium">{rangeResult.startRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">End ({range?.to ? format(range.to, "LLL dd") : ''}):</span>
                        <span className="font-mono font-medium">{rangeResult.endRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm font-semibold">Change:</span>
                        <span className={cn("font-semibold flex items-center gap-1", rangeResult.endRate >= rangeResult.startRate ? 'text-positive' : 'text-negative')}>
                            {rangeResult.endRate >= rangeResult.startRate ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {(((rangeResult.endRate - rangeResult.startRate) / rangeResult.startRate) * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>
             )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
