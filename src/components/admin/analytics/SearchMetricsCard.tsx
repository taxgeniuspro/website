/**
 * Google Search Console Metrics Display Card
 * Shows organic search performance metrics from Search Console
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  Eye,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Target,
} from 'lucide-react';
import type { SearchConsoleMetrics } from '@/lib/services/search-console.service';

interface SearchMetricsCardProps {
  metrics: SearchConsoleMetrics | null;
  isLoading?: boolean;
}

export function SearchMetricsCard({ metrics, isLoading }: SearchMetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Organic Search Performance
          </CardTitle>
          <CardDescription>Loading Search Console data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Organic Search Performance
          </CardTitle>
          <CardDescription>Google Search Console data unavailable</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Configure Google Search Console credentials to see organic search metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatGrowth = (growth: number) => {
    const formatted = Math.abs(growth).toFixed(1);
    return growth >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  const formatCTR = (ctr: number) => {
    return `${(ctr * 100).toFixed(2)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Organic Search Performance (Search Console)
        </CardTitle>
        <CardDescription>
          How your site performs in Google search results
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Clicks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MousePointerClick className="w-4 h-4" />
                Clicks
              </div>
              <div className="flex items-center gap-1 text-xs">
                {metrics.clicksGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span
                  className={
                    metrics.clicksGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {formatGrowth(metrics.clicksGrowth)}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold">{metrics.totalClicks.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              From Google search results
            </p>
          </div>

          {/* Total Impressions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4" />
                Impressions
              </div>
              <div className="flex items-center gap-1 text-xs">
                {metrics.impressionsGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span
                  className={
                    metrics.impressionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {formatGrowth(metrics.impressionsGrowth)}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold">
              {metrics.totalImpressions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Times your site appeared
            </p>
          </div>

          {/* Average CTR */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              Click-Through Rate
            </div>
            <p className="text-2xl font-bold">{formatCTR(metrics.averageCTR)}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.totalClicks.toLocaleString()} clicks /{' '}
              {metrics.totalImpressions.toLocaleString()} impressions
            </p>
          </div>

          {/* Average Position */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              Avg Position
            </div>
            <p className="text-2xl font-bold">
              #{metrics.averagePosition.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">
              Average ranking in search
            </p>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {formatCTR(metrics.averageCTR)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Click-Through Rate
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {metrics.totalClicks.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Organic Clicks
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                #{metrics.averagePosition.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Search Position
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
