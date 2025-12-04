/**
 * Google Analytics 4 Metrics Display Card
 * Shows GA4 website traffic metrics in analytics dashboards
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  MousePointerClick,
  Eye,
  TrendingUp,
  TrendingDown,
  Clock,
  Activity,
} from 'lucide-react';
import type { GA4TrafficMetrics } from '@/lib/services/google-analytics.service';

interface GA4MetricsCardProps {
  metrics: GA4TrafficMetrics | null;
  isLoading?: boolean;
}

export function GA4MetricsCard({ metrics, isLoading }: GA4MetricsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Website Performance
          </CardTitle>
          <CardDescription>Loading GA4 data...</CardDescription>
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
            <Activity className="w-5 h-5" />
            Website Performance
          </CardTitle>
          <CardDescription>Google Analytics data unavailable</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Configure Google Analytics credentials to see website traffic metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const formatGrowth = (growth: number) => {
    const formatted = Math.abs(growth).toFixed(1);
    return growth >= 0 ? `+${formatted}%` : `-${formatted}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Website Performance (Google Analytics)
        </CardTitle>
        <CardDescription>Traffic and engagement metrics from GA4</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Sessions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MousePointerClick className="w-4 h-4" />
                Sessions
              </div>
              <div className="flex items-center gap-1 text-xs">
                {metrics.sessionsGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span
                  className={
                    metrics.sessionsGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {formatGrowth(metrics.sessionsGrowth)}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold">{metrics.sessions.toLocaleString()}</p>
          </div>

          {/* Users */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                Users
              </div>
              <div className="flex items-center gap-1 text-xs">
                {metrics.usersGrowth >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-green-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-600" />
                )}
                <span
                  className={
                    metrics.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                  }
                >
                  {formatGrowth(metrics.usersGrowth)}
                </span>
              </div>
            </div>
            <p className="text-2xl font-bold">{metrics.users.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.newUsers.toLocaleString()} new
            </p>
          </div>

          {/* Pageviews */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              Pageviews
            </div>
            <p className="text-2xl font-bold">{metrics.pageviews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {metrics.sessions > 0
                ? (metrics.pageviews / metrics.sessions).toFixed(2)
                : '0'}{' '}
              pages/session
            </p>
          </div>

          {/* Avg Session Duration */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Avg Duration
            </div>
            <p className="text-2xl font-bold">
              {formatDuration(metrics.avgSessionDuration)}
            </p>
            <p className="text-xs text-muted-foreground">
              {(metrics.bounceRate * 100).toFixed(1)}% bounce rate
            </p>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="pt-4 border-t">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {metrics.newUsers.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">New Users</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                {((1 - metrics.bounceRate) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Engagement Rate</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {metrics.sessions > 0
                  ? (metrics.pageviews / metrics.sessions).toFixed(2)
                  : '0'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pages per Session</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
