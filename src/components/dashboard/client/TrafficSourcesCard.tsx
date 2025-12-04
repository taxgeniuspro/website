'use client';

/**
 * Traffic Sources Card
 *
 * Shows top traffic sources where referrals came from
 * Displays with progress bars and percentages
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, TrendingUp } from 'lucide-react';

interface TrafficSource {
  source: string;
  clicks: number;
  percentage: number;
}

interface TrafficSourcesCardProps {
  sources: TrafficSource[];
  className?: string;
}

const SOURCE_ICONS: Record<string, string> = {
  facebook: '📘',
  instagram: '📷',
  twitter: '🐦',
  linkedin: '💼',
  tiktok: '🎵',
  youtube: '🎥',
  direct: '🔗',
  email: '📧',
};

function getSourceIcon(source: string): string {
  const lowerSource = source.toLowerCase();
  for (const [key, icon] of Object.entries(SOURCE_ICONS)) {
    if (lowerSource.includes(key)) {
      return icon;
    }
  }
  return '🌐';
}

export function TrafficSourcesCard({ sources, className }: TrafficSourcesCardProps) {
  if (sources.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Where Referrals Came From
          </CardTitle>
          <CardDescription>Track which platforms bring you the most referrals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No traffic sources yet</p>
            <p className="text-xs mt-2">
              Share your links on social media and other platforms to start tracking
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topSource = sources[0];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Where Referrals Came From
            </CardTitle>
            <CardDescription>Your top traffic sources</CardDescription>
          </div>
          {topSource && (
            <Badge variant="secondary" className="text-xs">
              #{1} {getSourceIcon(topSource.source)} {topSource.source}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source, index) => (
            <div key={source.source} className="space-y-2">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="w-8 h-8 justify-center flex-shrink-0">
                  {index + 1}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getSourceIcon(source.source)}</span>
                      <p className="text-sm font-medium truncate">{source.source}</p>
                    </div>
                    <div className="text-sm text-muted-foreground flex-shrink-0 ml-2">
                      {source.clicks} ({source.percentage.toFixed(1)}%)
                    </div>
                  </div>
                  <Progress value={source.percentage} className="h-2" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Insight */}
        {topSource && topSource.percentage > 40 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Strong Performance
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {topSource.source} is your best performing source with{' '}
                  {topSource.percentage.toFixed(0)}% of your traffic. Consider focusing more effort
                  here!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
