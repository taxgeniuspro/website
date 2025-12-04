/**
 * Top Pages Chart Component
 * Displays the top performing pages in organic search
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ExternalLink } from 'lucide-react';
import type { SearchPage } from '@/lib/services/search-console.service';

interface TopPagesChartProps {
  pages: SearchPage[];
  isLoading?: boolean;
}

export function TopPagesChart({ pages, isLoading }: TopPagesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Top Performing Pages
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

  if (!pages || pages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Top Performing Pages
          </CardTitle>
          <CardDescription>No page data available</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <p className="text-sm">
            Page performance data will appear once Search Console is configured
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatCTR = (ctr: number) => {
    return `${(ctr * 100).toFixed(1)}%`;
  };

  const getPageName = (url: string) => {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      if (path === '/' || path === '') return 'Homepage';

      // Clean up the path for display
      return path
        .split('/')
        .filter(Boolean)
        .map(segment =>
          segment
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        )
        .join(' > ');
    } catch {
      return url;
    }
  };

  const maxClicks = Math.max(...pages.map(p => p.clicks));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Top Performing Pages
        </CardTitle>
        <CardDescription>
          Pages ranking highest in Google search results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pages.slice(0, 10).map((page, index) => (
            <div
              key={index}
              className="space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <p className="font-medium text-sm truncate">
                      {getPageName(page.page)}
                    </p>
                    <a
                      href={page.page}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {page.page}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">
                    {page.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">clicks</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
                  style={{ width: `${(page.clicks / maxClicks) * 100}%` }}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{page.impressions.toLocaleString()} impressions</span>
                <span>{formatCTR(page.ctr)} CTR</span>
                <span>Pos #{page.position.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {pages.reduce((sum, p) => sum + p.clicks, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Clicks</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {pages.reduce((sum, p) => sum + p.impressions, 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Impressions</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {(
                  (pages.reduce((sum, p) => sum + p.ctr, 0) / pages.length) *
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
