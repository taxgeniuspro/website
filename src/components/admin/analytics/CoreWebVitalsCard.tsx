/**
 * Core Web Vitals Display Card
 * Shows Google's Core Web Vitals metrics for mobile and desktop
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Smartphone, Monitor, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { PageSpeedResult } from '@/lib/services/pagespeed-insights.service';

interface CoreWebVitalsCardProps {
  vitals: PageSpeedResult | null;
  isLoading?: boolean;
}

export function CoreWebVitalsCard({ vitals, isLoading }: CoreWebVitalsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Core Web Vitals
          </CardTitle>
          <CardDescription>Loading performance metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vitals || (!vitals.mobile && !vitals.desktop)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" />
            Core Web Vitals
          </CardTitle>
          <CardDescription>Performance metrics unavailable</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Configure PageSpeed Insights API key to see Core Web Vitals
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR') => {
    switch (status) {
      case 'GOOD':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'NEEDS_IMPROVEMENT':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'POOR':
        return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR') => {
    switch (status) {
      case 'GOOD':
        return 'text-green-600 bg-green-50 dark:bg-green-950';
      case 'NEEDS_IMPROVEMENT':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950';
      case 'POOR':
        return 'text-red-600 bg-red-50 dark:bg-red-950';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatMetric = (value: number, unit: 'ms' | 'score') => {
    if (unit === 'ms') {
      if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
      return `${Math.round(value)}ms`;
    }
    return value.toFixed(3);
  };

  const renderDeviceMetrics = (
    data: PageSpeedResult['mobile'] | PageSpeedResult['desktop'],
    deviceType: 'mobile' | 'desktop'
  ) => {
    if (!data) return null;

    const Icon = deviceType === 'mobile' ? Smartphone : Monitor;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <h3 className="font-semibold capitalize">{deviceType}</h3>
          <span className={`text-2xl font-bold ml-auto ${getScoreColor(data.performanceScore)}`}>
            {data.performanceScore}
          </span>
        </div>

        {/* Core Web Vitals */}
        <div className="grid gap-3">
          {/* LCP - Largest Contentful Paint */}
          <div className={`p-3 rounded-lg ${getStatusColor(data.lcpStatus)}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(data.lcpStatus)}
                <span className="font-medium text-sm">LCP</span>
              </div>
              <span className="font-bold">{formatMetric(data.LCP, 'ms')}</span>
            </div>
            <p className="text-xs opacity-80">Largest Contentful Paint</p>
          </div>

          {/* FID - First Input Delay */}
          <div className={`p-3 rounded-lg ${getStatusColor(data.fidStatus)}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(data.fidStatus)}
                <span className="font-medium text-sm">FID</span>
              </div>
              <span className="font-bold">{formatMetric(data.FID, 'ms')}</span>
            </div>
            <p className="text-xs opacity-80">First Input Delay</p>
          </div>

          {/* CLS - Cumulative Layout Shift */}
          <div className={`p-3 rounded-lg ${getStatusColor(data.clsStatus)}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(data.clsStatus)}
                <span className="font-medium text-sm">CLS</span>
              </div>
              <span className="font-bold">{formatMetric(data.CLS, 'score')}</span>
            </div>
            <p className="text-xs opacity-80">Cumulative Layout Shift</p>
          </div>
        </div>

        {/* Additional Scores */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
          <div className="text-center">
            <p className={`text-lg font-bold ${getScoreColor(data.accessibilityScore)}`}>
              {data.accessibilityScore}
            </p>
            <p className="text-xs text-muted-foreground">Accessibility</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${getScoreColor(data.bestPracticesScore)}`}>
              {data.bestPracticesScore}
            </p>
            <p className="text-xs text-muted-foreground">Best Practices</p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-bold ${getScoreColor(data.seoScore)}`}>
              {data.seoScore}
            </p>
            <p className="text-xs text-muted-foreground">SEO</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5" />
          Core Web Vitals (PageSpeed Insights)
        </CardTitle>
        <CardDescription>
          Performance metrics that measure user experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {renderDeviceMetrics(vitals.mobile, 'mobile')}
          {renderDeviceMetrics(vitals.desktop, 'desktop')}
        </div>

        {/* Info Footer */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Last updated: {vitals.fetchedAt.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Data from{' '}
            <a
              href={`https://pagespeed.web.dev/report?url=${encodeURIComponent(vitals.url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              PageSpeed Insights
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
