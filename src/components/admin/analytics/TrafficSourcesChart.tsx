/**
 * Traffic Sources Chart Component
 * Displays where website traffic is coming from (GA4 data)
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Share2 } from 'lucide-react';
import type { GA4TrafficSource } from '@/lib/services/google-analytics.service';

interface TrafficSourcesChartProps {
  sources: GA4TrafficSource[];
  isLoading?: boolean;
}

export function TrafficSourcesChart({ sources, isLoading }: TrafficSourcesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Traffic Sources
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sources || sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Traffic Sources
          </CardTitle>
          <CardDescription>No traffic source data available</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Traffic sources will appear once GA4 is configured</p>
        </CardContent>
      </Card>
    );
  }

  const getSourceColor = (source: string) => {
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('google')) return 'bg-blue-500';
    if (lowerSource.includes('facebook') || lowerSource.includes('social')) return 'bg-blue-600';
    if (lowerSource.includes('direct')) return 'bg-green-500';
    if (lowerSource.includes('organic')) return 'bg-purple-500';
    if (lowerSource.includes('referral')) return 'bg-orange-500';
    if (lowerSource.includes('email')) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          Traffic Sources
        </CardTitle>
        <CardDescription>Where your website visitors are coming from</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.map((source, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize">{source.source}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {source.sessions.toLocaleString()} sessions
                </span>
                <span className="font-semibold">{source.percentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${getSourceColor(source.source)} transition-all`}
                style={{ width: `${source.percentage}%` }}
              />
            </div>
          </div>
        ))}

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {sources.reduce((sum, s) => sum + s.sessions, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Sessions</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {sources.reduce((sum, s) => sum + s.users, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
