/**
 * Source Breakdown Component
 *
 * Displays lead attribution breakdown by type, campaign, and location
 * Shows best performing channels and sources
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

'use client';

import { useSourceBreakdown } from '@/hooks/useMyMaterials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, PieChart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SourceBreakdownProps {
  dateRange?: string;
  className?: string;
}

export function SourceBreakdown({ dateRange = 'all', className }: SourceBreakdownProps) {
  const { data, isLoading, error } = useSourceBreakdown({ dateRange });

  if (isLoading) {
    return <BreakdownSkeleton className={className} />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Source Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">Failed to load source data</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { byType, byCampaign, byLocation, summary } = data;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Lead Source Attribution</CardTitle>
        <p className="text-sm text-muted-foreground">Where your customers are coming from</p>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatItem
            label="Total Materials"
            value={summary.totalMaterials.toLocaleString()}
            icon={<BarChart className="w-4 h-4" />}
          />
          <StatItem
            label="Total Clicks"
            value={summary.totalClicks.toLocaleString()}
            icon={<TrendingUp className="w-4 h-4" />}
          />
          <StatItem
            label="Conversions"
            value={summary.totalConversions.toLocaleString()}
            icon={<PieChart className="w-4 h-4" />}
          />
          <StatItem label="Avg. Rate" value={`${summary.averageConversionRate.toFixed(1)}%`} />
        </div>

        {/* Breakdown Tabs */}
        <Tabs defaultValue="type" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="type">By Type</TabsTrigger>
            <TabsTrigger value="campaign">By Campaign</TabsTrigger>
            <TabsTrigger value="location">By Location</TabsTrigger>
          </TabsList>

          <TabsContent value="type" className="space-y-4">
            <div className="space-y-3">
              {byType.slice(0, 5).map((item) => (
                <SourceItem
                  key={item.type}
                  label={formatType(item.type)}
                  count={item.count}
                  clicks={item.clicks}
                  conversions={item.conversions}
                  conversionRate={item.conversionRate}
                  maxClicks={byType[0]?.clicks || 1}
                />
              ))}
            </div>
            {byType.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No data available</p>
            )}
          </TabsContent>

          <TabsContent value="campaign" className="space-y-4">
            <div className="space-y-3">
              {byCampaign.slice(0, 5).map((item) => (
                <SourceItem
                  key={item.campaign}
                  label={item.campaign}
                  count={item.count}
                  clicks={item.clicks}
                  conversions={item.conversions}
                  conversionRate={item.conversionRate}
                  maxClicks={byCampaign[0]?.clicks || 1}
                />
              ))}
            </div>
            {byCampaign.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No campaigns found</p>
            )}
          </TabsContent>

          <TabsContent value="location" className="space-y-4">
            <div className="space-y-3">
              {byLocation.slice(0, 5).map((item) => (
                <SourceItem
                  key={item.location}
                  label={item.location}
                  count={item.count}
                  clicks={item.clicks}
                  conversions={item.conversions}
                  conversionRate={item.conversionRate}
                  maxClicks={byLocation[0]?.clicks || 1}
                />
              ))}
            </div>
            {byLocation.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No location data available</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Best Performers */}
        <div className="mt-6 pt-6 border-t space-y-2">
          <h4 className="text-sm font-medium">Best Performers</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default" className="text-sm">
              Type: {formatType(summary.bestPerformingType)}
            </Badge>
            {summary.bestPerformingCampaign !== 'N/A' && (
              <Badge variant="secondary" className="text-sm">
                Campaign: {summary.bestPerformingCampaign}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

interface SourceItemProps {
  label: string;
  count: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
  maxClicks: number;
}

function SourceItem({
  label,
  count,
  clicks,
  conversions,
  conversionRate,
  maxClicks,
}: SourceItemProps) {
  const widthPercentage = maxClicks > 0 ? (clicks / maxClicks) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium">{label}</span>
          <Badge variant="outline" className="text-xs">
            {count} material{count !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>{clicks.toLocaleString()} clicks</span>
          <span>•</span>
          <span>{conversions} conversions</span>
          <Badge
            variant={conversionRate > 10 ? 'default' : conversionRate > 5 ? 'secondary' : 'outline'}
          >
            {conversionRate.toFixed(1)}%
          </Badge>
        </div>
      </div>
      <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            conversionRate > 10
              ? 'bg-green-500'
              : conversionRate > 5
                ? 'bg-blue-500'
                : 'bg-gray-400'
          )}
          style={{ width: `${widthPercentage}%` }}
        />
      </div>
    </div>
  );
}

function formatType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function BreakdownSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
