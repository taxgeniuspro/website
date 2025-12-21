'use client';

/**
 * Source Performance Chart Component
 *
 * Shows which marketing links/campaigns drive conversions:
 * - Comparative bar charts by source type
 * - Click-through to source details
 * - Conversion rates by source
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BarChart3,
  Link as LinkIcon,
  QrCode,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface SourceData {
  id: string;
  name: string;
  type: 'direct' | 'qr_code' | 'social' | 'affiliate' | 'referral' | 'other';
  clicks: number;
  leads: number;
  conversions: number;
  conversionRate: number;
  percentOfTotal: number;
  trend?: number;
}

interface SourcePerformanceChartProps {
  dateRange?: '7d' | '30d' | '90d' | 'all';
  preparerId?: string;
}

export function SourcePerformanceChart({ dateRange = '30d', preparerId }: SourcePerformanceChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['source-performance', dateRange, preparerId],
    queryFn: async () => {
      const params = new URLSearchParams({ dateRange });
      if (preparerId) params.append('preparerId', preparerId);
      const response = await fetch(`/api/analytics/source-performance?${params}`);
      if (!response.ok) throw new Error('Failed to fetch source data');
      return response.json();
    },
  });

  const getSourceIcon = (type: SourceData['type']) => {
    switch (type) {
      case 'qr_code':
        return <QrCode className="h-4 w-4" />;
      case 'affiliate':
      case 'referral':
        return <Users className="h-4 w-4" />;
      case 'social':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getSourceColor = (type: SourceData['type']) => {
    switch (type) {
      case 'qr_code':
        return 'bg-purple-500';
      case 'affiliate':
        return 'bg-blue-500';
      case 'referral':
        return 'bg-green-500';
      case 'social':
        return 'bg-pink-500';
      case 'direct':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeBadgeVariant = (type: SourceData['type']) => {
    switch (type) {
      case 'qr_code':
        return 'secondary';
      case 'affiliate':
      case 'referral':
        return 'default';
      case 'social':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Source Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Unable to load source data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sources: SourceData[] = data?.sources || [];
  const totalClicks = data?.totalClicks || 0;
  const totalConversions = data?.totalConversions || 0;
  const topPerformer = sources[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Source Performance
        </CardTitle>
        <CardDescription>
          Which links and campaigns are driving conversions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
          <div className="text-center">
            <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{totalConversions.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Conversions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Rate</p>
          </div>
        </div>

        {/* Top performer highlight */}
        {topPerformer && (
          <div className="flex items-center justify-between p-4 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                {getSourceIcon(topPerformer.type)}
              </div>
              <div>
                <p className="font-medium">Top Performer</p>
                <p className="text-sm text-muted-foreground">{topPerformer.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600 dark:text-green-400">
                {topPerformer.conversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">conversion rate</p>
            </div>
          </div>
        )}

        {/* Source list */}
        {sources.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No source data available</p>
            <p className="text-xs text-muted-foreground mt-1">
              Data will appear once leads start coming in
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sources.map((source, index) => (
              <div key={source.id} className="space-y-2">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground w-4">
                      {index + 1}.
                    </span>
                    <div className={`p-1 rounded ${getSourceColor(source.type)}/10`}>
                      {getSourceIcon(source.type)}
                    </div>
                    <span className="font-medium text-sm truncate max-w-[150px] sm:max-w-[200px]">
                      {source.name}
                    </span>
                    <Badge variant={getTypeBadgeVariant(source.type) as any} className="text-xs capitalize">
                      {source.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground hidden sm:inline">
                      {source.clicks} clicks
                    </span>
                    <span className="font-medium">{source.conversions} conv.</span>
                    <span className="font-bold text-primary">
                      {source.conversionRate.toFixed(1)}%
                    </span>
                    {source.trend !== undefined && (
                      <div className="flex items-center gap-0.5">
                        {source.trend >= 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span
                          className={`text-xs ${
                            source.trend >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {Math.abs(source.trend).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <Progress
                    value={source.percentOfTotal}
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {source.percentOfTotal.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View all button */}
        {sources.length > 0 && (
          <Button variant="outline" className="w-full" asChild>
            <a href="/dashboard/tax-preparer/analytics">
              View Detailed Analytics
              <ArrowUpRight className="h-4 w-4 ml-2" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
