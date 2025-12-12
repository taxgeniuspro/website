'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Star, Zap, Crown } from 'lucide-react';

interface TierProgressData {
  tierProgress: {
    currentTier: string;
    currentRate: number;
    nextTier?: string;
    nextRate?: number;
    conversionsNeeded?: number;
    progressPercentage: number;
    totalConversions: number;
  } | null;
  effectiveRate: {
    type: string;
    rate: number;
    flatAmount?: number;
    source: string;
    tier?: string;
    minimumPayout: number;
  };
  stats: {
    totalConversions: number;
    lifetimeEarnings: number;
    currentTier: string | null;
  };
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  Bronze: <Trophy className="w-5 h-5 text-amber-600" />,
  Silver: <Star className="w-5 h-5 text-gray-400" />,
  Gold: <Crown className="w-5 h-5 text-yellow-500" />,
  Platinum: <Zap className="w-5 h-5 text-purple-500" />,
  Diamond: <Crown className="w-5 h-5 text-blue-500" />,
};

const TIER_COLORS: Record<string, string> = {
  Bronze: 'bg-amber-100 text-amber-800 border-amber-300',
  Silver: 'bg-gray-100 text-gray-800 border-gray-300',
  Gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Platinum: 'bg-purple-100 text-purple-800 border-purple-300',
  Diamond: 'bg-blue-100 text-blue-800 border-blue-300',
};

export function TierProgress() {
  const [data, setData] = useState<TierProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTierProgress();
  }, []);

  const fetchTierProgress = async () => {
    try {
      const res = await fetch('/api/affiliate/tier');
      if (res.ok) {
        const tierData = await res.json();
        setData(tierData);
      }
    } catch (error) {
      console.error('Failed to fetch tier progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { tierProgress, effectiveRate, stats } = data;
  const currentTier = tierProgress?.currentTier || 'Standard';
  const tierIcon = TIER_ICONS[currentTier] || <Trophy className="w-5 h-5" />;
  const tierColor = TIER_COLORS[currentTier] || 'bg-gray-100 text-gray-800 border-gray-300';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Your Commission Tier
          </CardTitle>
          <Badge className={`${tierColor} border`}>
            {tierIcon}
            <span className="ml-1">{currentTier}</span>
          </Badge>
        </div>
        <CardDescription>
          {effectiveRate.source === 'CUSTOM'
            ? 'You have a custom commission rate'
            : effectiveRate.source === 'GROUP_TIERED'
              ? 'Your rate is based on your performance tier'
              : effectiveRate.source === 'GROUP_BASE'
                ? 'You\'re earning your group\'s base rate'
                : 'You\'re earning the standard commission rate'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Rate */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Current Commission Rate</p>
            <p className="text-3xl font-bold text-green-600">
              {effectiveRate.type === 'FLAT'
                ? `$${effectiveRate.flatAmount || effectiveRate.rate}`
                : `${effectiveRate.rate}%`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Conversions</p>
            <p className="text-2xl font-bold">{stats.totalConversions}</p>
          </div>
        </div>

        {/* Progress to Next Tier */}
        {tierProgress?.nextTier && tierProgress.conversionsNeeded !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress to {tierProgress.nextTier}</span>
              <span className="font-medium">{tierProgress.progressPercentage}%</span>
            </div>
            <Progress value={tierProgress.progressPercentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {tierProgress.conversionsNeeded} more conversion
                {tierProgress.conversionsNeeded !== 1 ? 's' : ''} needed
              </span>
              <span className="flex items-center gap-1">
                <span>{TIER_ICONS[tierProgress.nextTier] || <Trophy className="w-3 h-3" />}</span>
                {tierProgress.nextRate}% commission
              </span>
            </div>
          </div>
        )}

        {/* Tier Breakdown */}
        {tierProgress && (
          <div className="pt-4 border-t space-y-2">
            <p className="text-sm font-medium">Commission Tiers:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {['Bronze', 'Silver', 'Gold', 'Platinum'].map((tier) => {
                const isCurrentTier = tier === currentTier;
                const isPastTier = ['Bronze', 'Silver', 'Gold', 'Platinum'].indexOf(tier) <
                  ['Bronze', 'Silver', 'Gold', 'Platinum'].indexOf(currentTier);

                return (
                  <div
                    key={tier}
                    className={`p-2 rounded border text-center ${
                      isCurrentTier
                        ? TIER_COLORS[tier]
                        : isPastTier
                          ? 'bg-green-50 border-green-200 text-green-700'
                          : 'bg-muted/50 border-border text-muted-foreground'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      {TIER_ICONS[tier]}
                    </div>
                    <p className="text-xs font-medium">{tier}</p>
                    {isCurrentTier && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        Current
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lifetime Earnings */}
        <div className="pt-4 border-t flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Lifetime Earnings</p>
            <p className="text-lg font-bold">${stats.lifetimeEarnings.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Minimum Payout</p>
            <p className="text-lg font-bold">${effectiveRate.minimumPayout}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
