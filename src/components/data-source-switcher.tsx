'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Globe } from 'lucide-react';
import type { DataSource } from '@/lib/types';
import { useTranslation } from '@/hooks/use-translation';

type DataSourceSwitcherProps = {
    currentSource: DataSource;
    onSourceChange: (source: DataSource) => void;
};

export function DataSourceSwitcher({ currentSource, onSourceChange }: DataSourceSwitcherProps) {
    const { t } = useTranslation();
    return (
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
            <CardHeader>
                <CardTitle className="text-lg font-semibold">{t('dataSource.title')}</CardTitle>
                <CardDescription>{t('dataSource.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Button 
                    onClick={() => onSourceChange('nbrb')} 
                    variant={currentSource === 'nbrb' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Server className="mr-3 h-5 w-5 flex-shrink-0" />
                    <div>
                        <p className="font-semibold">{t('dataSource.nbrb.title')}</p>
                        <p className="text-xs text-muted-foreground font-normal">{t('dataSource.nbrb.description')}</p>
                    </div>
                </Button>
                <Button 
                    onClick={() => onSourceChange('currencyapi')}
                    variant={currentSource === 'currencyapi' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Globe className="mr-3 h-5 w-5 flex-shrink-0" />
                     <div>
                        <p className="font-semibold">{t('dataSource.currencyapi.title')}</p>
                        <p className="text-xs text-muted-foreground font-normal">{t('dataSource.currencyapi.description')}</p>
                    </div>
                </Button>
                 <p className="text-xs text-muted-foreground pt-2">{t('dataSource.resetWarning')}</p>
            </CardContent>
        </Card>
    );
}
