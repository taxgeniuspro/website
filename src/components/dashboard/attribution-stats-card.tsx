'use client';

/**
 * Attribution Stats Card
 *
 * Displays referral attribution statistics for affiliates, referrers, and tax preparers
 * Shows leads by attribution method, conversion rates, and commission earnings
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 5
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Cookie,
  Mail,
  Phone,
  Globe,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface AttributionStats {
  totalLeads: number;
  byMethod: {
    cookie: number;
    emailMatch: number;
    phoneMatch: number;
    direct: number;
  };
  crossDeviceRate: number;
  conversionRate: number;
  totalCommissions: number;
  averageCommissionRate: number;
  topSources: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

interface AttributionStatsCardProps {
  className?: string;
  period?: '7d' | '30d' | '90d' | 'all';
}

const ATTRIBUTION_METHODS = [
  {
    key: 'cookie' as const,
    label: 'Clicked Your Link',
    icon: Cookie,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    description: 'Signed up on same device',
    confidence: 100,
  },
  {
    key: 'emailMatch' as const,
    label: 'Matched by Email',
    icon: Mail,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    description: 'Used different device',
    confidence: 90,
  },
  {
    key: 'phoneMatch' as const,
    label: 'Matched by Phone',
    icon: Phone,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    description: 'Used different device',
    confidence: 85,
  },
  {
    key: 'direct' as const,
    label: 'Direct Visit',
    icon: Globe,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    description: 'Typed URL directly',
    confidence: 100,
  },
];

export function AttributionStatsCard({ className, period = '30d' }: AttributionStatsCardProps) {
  const [stats, setStats] = useState<AttributionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(period);

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/attribution?period=${selectedPeriod}`);

      if (!response.ok) {
        throw new Error('Failed to fetch attribution stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      logger.error('Failed to fetch attribution stats', { error: err });
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Referral Performance</CardTitle>
          <CardDescription>Loading your statistics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Referral Performance</CardTitle>
          <CardDescription>Unable to load your statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error || 'No data available yet'}</p>
            <Button variant="outline" size="sm" onClick={fetchStats} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalTracked =
    stats.byMethod.cookie + stats.byMethod.emailMatch + stats.byMethod.phoneMatch;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Referral Performance</CardTitle>
            <CardDescription>See how people found you and signed up</CardDescription>
          </div>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as typeof period)}>
            <TabsList>
              <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
              <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
              <TabsTrigger value="all">All Time</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              People Referred
            </div>
            <p className="text-2xl font-bold">{stats.totalLeads}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Success Rate
            </div>
            <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              Total Earned
            </div>
            <p className="text-2xl font-bold">${stats.totalCommissions.toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Per Referral
            </div>
            <p className="text-2xl font-bold">${stats.averageCommissionRate.toFixed(2)}</p>
          </div>
        </div>

        {/* Attribution Methods Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">How People Found You</h3>
            {stats.crossDeviceRate > 0 && (
              <Badge variant="outline" className="text-xs">
                {stats.crossDeviceRate.toFixed(0)}% switched devices
              </Badge>
            )}
          </div>

          {ATTRIBUTION_METHODS.map((method) => {
            const count = stats.byMethod[method.key];
            const percentage = stats.totalLeads > 0 ? (count / stats.totalLeads) * 100 : 0;
            const Icon = method.icon;

            return (
              <div key={method.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', method.bgColor)}>
                      <Icon className={cn('h-4 w-4', method.color)} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{method.label}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>

        {/* Cross-Device Attribution Insight */}
        {stats.crossDeviceRate > 20 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Great News! We're Tracking Your Referrals
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {stats.crossDeviceRate.toFixed(0)}% of your referrals clicked your link on one
                  device (like their phone) but signed up on another (like their computer). We still
                  matched them to you and you'll get credit!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Top Sources */}
        {stats.topSources.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Where Your Referrals Came From</h3>
            {stats.topSources.map((source, index) => (
              <div key={source.source} className="flex items-center gap-3">
                <Badge variant="outline" className="w-8 justify-center">
                  {index + 1}
                </Badge>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{source.source || 'Direct'}</p>
                    <p className="text-sm text-muted-foreground">
                      {source.count} ({source.percentage.toFixed(1)}%)
                    </p>
                  </div>
                  <Progress value={source.percentage} className="h-1.5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button - Removed as clients don't have a dedicated analytics page */}
        {/* Analytics data is shown inline on the referrals page */}
      </CardContent>
    </Card>
  );
}
