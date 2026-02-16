
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { TrendingUp, Coins, Zap, ShieldCheck, LayoutGrid, Brain, Wallet, Gamepad2, Rocket, Database, Network, Globe, Landmark, Anchor, Layers, Cpu, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTelegram } from '@/hooks/use-telegram';
import { findRate } from '@/lib/currencies';

type OtherAssetsViewProps = {
    onShowRate: (from: string) => void;
};

const assetGroups = [
  {
    id: 'popular',
    icon: TrendingUp,
    color: 'text-orange-500',
    assets: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'LTC', 'BCH'],
  },
  {
    id: 'telegram',
    icon: Zap,
    color: 'text-blue-500',
    assets: ['TON', 'NOT', 'DOGS', 'USDT'],
  },
  {
    id: 'infrastructure',
    icon: Layers,
    color: 'text-purple-500',
    assets: ['NEAR', 'ATOM', 'ARB', 'OP', 'TRX', 'MATIC', 'AVAX', 'LINK', 'ICP', 'SUI', 'APT', 'HBAR', 'STRK', 'W'],
  },
  {
    id: 'rwa',
    icon: Anchor,
    color: 'text-amber-700',
    assets: ['ONDO', 'PENDLE', 'MKR'],
  },
  {
    id: 'stablecoins',
    icon: ShieldCheck,
    color: 'text-green-500',
    assets: ['USDT', 'USDC', 'DAI', 'ENA'],
  },
  {
    id: 'ai',
    icon: Brain,
    color: 'text-blue-400',
    assets: ['FET', 'RENDER', 'AGIX', 'TAO'],
  },
  {
    id: 'defi',
    icon: Wallet,
    color: 'text-indigo-500',
    assets: ['UNI', 'AAVE', 'LDO', 'JUP', 'PYTH'],
  },
  {
    id: 'metaverse',
    icon: Gamepad2,
    color: 'text-pink-500',
    assets: ['SAND', 'MANA', 'AXS', 'IMX', 'GALA'],
  },
  {
    id: 'memes',
    icon: Rocket,
    color: 'text-yellow-500',
    assets: ['DOGE', 'SHIB', 'PEPE', 'FLOKI', 'BONK'],
  },
  {
    id: 'storage',
    icon: Database,
    color: 'text-cyan-600',
    assets: ['FIL', 'AR', 'STORJ'],
  },
  {
    id: 'depin',
    icon: Network,
    color: 'text-emerald-500',
    assets: ['HNT', 'THETA', 'AKASH'],
  },
  {
    id: 'exchange',
    icon: Landmark,
    color: 'text-slate-600',
    assets: ['BNB', 'OKB', 'CRO', 'KCS'],
  },
  {
    id: 'nfts',
    icon: LayoutGrid,
    color: 'text-rose-400',
    assets: ['BAYC', 'AZUKI', 'PUDGY'],
  }
];

export function OtherAssetsView({ onShowRate }: OtherAssetsViewProps) {
    const { t, getCurrencyName } = useTranslation();
    const { share, haptic } = useTelegram();

    const handleShareRate = (code: string) => {
        haptic('medium');
        const rate = findRate(code, 'USD');
        if (rate) {
            const shareText = t('otherAssets.shareText', {
                from: code,
                to: 'USD',
                rate: rate > 1000 ? rate.toFixed(2) : rate.toFixed(4).replace(/\.?0+$/, '')
            });
            share(shareText);
        }
    };

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
                <ScrollArea className="h-[450px] pr-4">
                    <div className="space-y-6">
                        {assetGroups.map((group) => (
                            <div key={group.id} className="space-y-3">
                                <div className="flex items-center gap-2 border-b pb-1">
                                    <group.icon className={cn("h-4 w-4", group.color)} />
                                    <h4 className="text-sm font-bold">{t(`otherAssets.${group.id}`)}</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {group.assets.map((code) => (
                                        <div 
                                            key={code} 
                                            className="flex flex-col p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors border group relative"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge variant="outline" className="font-mono text-[10px]">{code}</Badge>
                                                <div className="flex gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleShareRate(code)}
                                                        title={t('otherAssets.shareRate')}
                                                    >
                                                        <Share2 className="h-3 w-3 text-primary" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-6 px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => onShowRate(code)}
                                                    >
                                                        {t('otherAssets.action')}
                                                    </Button>
                                                </div>
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
