
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { TrendingUp, Coins, Zap, ShieldCheck, Share2, LayoutGrid } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

type OtherAssetsViewProps = {
    onShowRate: (from: string) => void;
};

const assetGroups = [
  {
    id: 'popular',
    icon: TrendingUp,
    color: 'text-orange-500',
    assets: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT'],
  },
  {
    id: 'telegram',
    icon: Zap,
    color: 'text-blue-500',
    assets: ['TON', 'NOT', 'DOGS'],
  },
  {
    id: 'stablecoins',
    icon: ShieldCheck,
    color: 'text-green-500',
    assets: ['USDT', 'USDC', 'DAI'],
  },
  {
    id: 'infrastructure',
    icon: Share2,
    color: 'text-purple-500',
    assets: ['TRX', 'MATIC', 'AVAX', 'LINK'],
  },
  {
    id: 'nfts',
    icon: LayoutGrid,
    color: 'text-pink-500',
    assets: ['BAYC', 'AZUKI', 'PUDGY'],
  }
];

export function OtherAssetsView({ onShowRate }: OtherAssetsViewProps) {
    const { t, getCurrencyName } = useTranslation();

    return (
        <Card className="bg-card/50 backdrop-blur-sm border-0 shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    {t('otherAssets.title')}
                </CardTitle>
                <CardDescription>{t('otherAssets.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-6">
                        {assetGroups.map((group) => (
                            <div key={group.id} className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <group.icon className={cn("h-4 w-4", group.color)} />
                                    <h4 className="text-sm font-bold">{t(`otherAssets.${group.id}`)}</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {group.assets.map((code) => (
                                        <div 
                                            key={code} 
                                            className="flex flex-col p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors border group"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge variant="outline" className="font-mono text-[10px]">{code}</Badge>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-6 px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => onShowRate(code)}
                                                >
                                                    {t('otherAssets.action')}
                                                </Button>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground truncate">
                                                {getCurrencyName(code)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
