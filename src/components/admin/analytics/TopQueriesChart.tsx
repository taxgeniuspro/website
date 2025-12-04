/**
 * Top Search Queries Chart Component
 * Displays the top search queries driving traffic from Google
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, TrendingUp } from 'lucide-react';
import type { SearchQuery } from '@/lib/services/search-console.service';

interface TopQueriesChartProps {
  queries: SearchQuery[];
  isLoading?: boolean;
}

export function TopQueriesChart({ queries, isLoading }: TopQueriesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Top Search Queries
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!queries || queries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Top Search Queries
          </CardTitle>
          <CardDescription>No search query data available</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Search queries will appear once Search Console is configured
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPositionColor = (position: number) => {
    if (position <= 3) return 'text-green-600 font-semibold';
    if (position <= 10) return 'text-blue-600 font-medium';
    if (position <= 20) return 'text-orange-600';
    return 'text-gray-600';
  };

  const formatCTR = (ctr: number) => {
    return `${(ctr * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Top Search Queries
        </CardTitle>
        <CardDescription>
          Keywords people use to find your site on Google
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {queries.slice(0, 10).map((query, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    #{index + 1}
                  </span>
                  <p className="font-medium truncate">{query.query}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{query.clicks.toLocaleString()} clicks</span>
                  <span>{query.impressions.toLocaleString()} impressions</span>
                  <span>{formatCTR(query.ctr)} CTR</span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <div className="text-right">
                  <p className={`text-sm ${getPositionColor(query.position)}`}>
                    #{query.position.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Position</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {queries.reduce((sum, q) => sum + q.clicks, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {queries.reduce((sum, q) => sum + q.impressions, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Impressions</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {(
                  (queries.reduce((sum, q) => sum + q.ctr, 0) / queries.length) *
                  100
                ).toFixed(1)}
                %
              </p>
              <p className="text-xs text-muted-foreground">Avg CTR</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
