'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Globe } from 'lucide-react';
import type { DataSource } from '@/lib/types';

type DataSourceSwitcherProps = {
    currentSource: DataSource;
    onSourceChange: (source: DataSource) => void;
};

export function DataSourceSwitcher({ currentSource, onSourceChange }: DataSourceSwitcherProps) {
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Data Source</CardTitle>
                <CardDescription>Select the source for currency exchange rates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Button 
                    onClick={() => onSourceChange('nbrb')} 
                    variant={currentSource === 'nbrb' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Server className="mr-3 h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">NBRB API</p>
                        <p className="text-xs text-muted-foreground font-normal">Official daily rates from the National Bank of Belarus.</p>
                    </div>
                </Button>
                <Button 
                    onClick={() => onSourceChange('currencyapi')}
                    variant={currentSource === 'currencyapi' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Globe className="mr-3 h-5 w-5 flex-shrink-0" />
                     <div>
                        <p className="font-semibold">CurrencyAPI.net</p>
                        <p className="text-xs text-muted-foreground font-normal">Frequent updates from global currency markets.</p>
                    </div>
                </Button>
                 <p className="text-xs text-muted-foreground pt-2">Switching the source will reset the chat session.</p>
            </CardContent>
        </Card>
    );
}
