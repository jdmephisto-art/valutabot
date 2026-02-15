
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Server, Globe, Landmark, MapPin } from 'lucide-react';
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
                    <div className="flex-1">
                        <p className="font-semibold">{t('dataSource.nbrb')}</p>
                        <p className="text-xs text-muted-foreground font-normal whitespace-normal">{t('dataSource.nbrbDesc')}</p>
                    </div>
                </Button>
                <Button 
                    onClick={() => onSourceChange('cbr')} 
                    variant={currentSource === 'cbr' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Landmark className="mr-3 h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold">{t('dataSource.cbr')}</p>
                        <p className="text-xs text-muted-foreground font-normal whitespace-normal">{t('dataSource.cbrDesc')}</p>
                    </div>
                </Button>
                <Button 
                    onClick={() => onSourceChange('ecb')} 
                    variant={currentSource === 'ecb' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Globe className="mr-3 h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold">{t('dataSource.ecb')}</p>
                        <p className="text-xs text-muted-foreground font-normal whitespace-normal">{t('dataSource.ecbDesc')}</p>
                    </div>
                </Button>
                <Button 
                    onClick={() => onSourceChange('nbk')} 
                    variant={currentSource === 'nbk' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <MapPin className="mr-3 h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold">{t('dataSource.nbk')}</p>
                        <p className="text-xs text-muted-foreground font-normal whitespace-normal">{t('dataSource.nbkDesc')}</p>
                    </div>
                </Button>
                <Button 
                    onClick={() => onSourceChange('worldcurrencyapi')}
                    variant={currentSource === 'worldcurrencyapi' ? 'default' : 'outline'}
                    className="w-full justify-start text-left h-auto py-2"
                >
                    <Globe className="mr-3 h-5 w-5 flex-shrink-0" />
                     <div className="flex-1">
                        <p className="font-semibold">{t('dataSource.worldcurrencyapi')}</p>
                        <p className="text-xs text-muted-foreground font-normal whitespace-normal">{t('dataSource.worldcurrencyapiDesc')}</p>
                    </div>
                </Button>
                 <p className="text-xs text-muted-foreground pt-2">{t('dataSource.warning')}</p>
            </CardContent>
        </Card>
    );
}
