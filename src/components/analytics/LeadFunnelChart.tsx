'use client';

/**
 * Lead Funnel Chart Component
 *
 * Visual representation of the lead conversion funnel:
 * Click → Intake Start → Completion → Assignment → Conversion
 *
 * Shows conversion rates between each stage with a visual funnel display.
 * Mobile-responsive with stacked bars on smaller screens.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface FunnelStage {
  name: string;
  count: number;
  conversionRate: number;
  dropoffRate: number;
  color: string;
}

interface LeadFunnelChartProps {
  dateRange?: '7d' | '30d' | '90d' | 'all';
  preparerId?: string;
}

export function LeadFunnelChart({ dateRange = '30d', preparerId }: LeadFunnelChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lead-funnel', dateRange, preparerId],
    queryFn: async () => {
      const params = new URLSearchParams({ dateRange });
      if (preparerId) params.append('preparerId', preparerId);
      const response = await fetch(`/api/analytics/lead-funnel?${params}`);
      if (!response.ok) throw new Error('Failed to fetch funnel data');
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
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
            <Target className="h-5 w-5" />
            Lead Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Unable to load funnel data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build funnel stages from data
  const stages: FunnelStage[] = [
    {
      name: 'Link Clicks',
      count: data?.clicks || 0,
      conversionRate: 100,
      dropoffRate: 0,
      color: 'bg-blue-500',
    },
    {
      name: 'Intake Started',
      count: data?.intakeStarted || 0,
      conversionRate: data?.clicks ? ((data.intakeStarted / data.clicks) * 100) : 0,
      dropoffRate: data?.clicks ? (100 - ((data.intakeStarted / data.clicks) * 100)) : 0,
      color: 'bg-cyan-500',
    },
    {
      name: 'Intake Completed',
      count: data?.intakeCompleted || 0,
      conversionRate: data?.intakeStarted ? ((data.intakeCompleted / data.intakeStarted) * 100) : 0,
      dropoffRate: data?.intakeStarted ? (100 - ((data.intakeCompleted / data.intakeStarted) * 100)) : 0,
      color: 'bg-teal-500',
    },
    {
      name: 'Assigned to Preparer',
      count: data?.assigned || 0,
      conversionRate: data?.intakeCompleted ? ((data.assigned / data.intakeCompleted) * 100) : 0,
      dropoffRate: data?.intakeCompleted ? (100 - ((data.assigned / data.intakeCompleted) * 100)) : 0,
      color: 'bg-green-500',
    },
    {
      name: 'Converted to Client',
      count: data?.converted || 0,
      conversionRate: data?.assigned ? ((data.converted / data.assigned) * 100) : 0,
      dropoffRate: data?.assigned ? (100 - ((data.converted / data.assigned) * 100)) : 0,
      color: 'bg-emerald-600',
    },
  ];

  const maxCount = Math.max(...stages.map(s => s.count), 1);
  const overallConversionRate = data?.clicks ? ((data.converted / data.clicks) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Lead Conversion Funnel
        </CardTitle>
        <CardDescription>
          Track how leads progress through each stage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall conversion rate */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <p className="text-sm text-muted-foreground">Overall Conversion Rate</p>
            <p className="text-2xl font-bold">{overallConversionRate.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Click to Client</p>
            <p className="text-lg font-medium">
              {data?.clicks || 0} → {data?.converted || 0}
            </p>
          </div>
        </div>

        {/* Funnel visualization */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
            const isFirst = index === 0;

            return (
              <div key={stage.name} className="space-y-1">
                {/* Stage header */}
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stage.count.toLocaleString()}</span>
                    {!isFirst && (
                      <span className="text-muted-foreground text-xs">
                        ({stage.conversionRate.toFixed(1)}% from prev)
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative">
                  <div className="h-8 bg-muted rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    >
                      {widthPercent > 15 && (
                        <span className="text-xs text-white font-medium">
                          {stage.count.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dropoff indicator (shown between stages) */}
                {index < stages.length - 1 && stage.dropoffRate > 0 && stage.count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground pl-2">
                    <TrendingDown className="h-3 w-3 text-red-500" />
                    <span>{stage.dropoffRate.toFixed(1)}% dropoff</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{data?.clicks || 0}</p>
            <p className="text-xs text-muted-foreground">Total Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-teal-600">{data?.intakeCompleted || 0}</p>
            <p className="text-xs text-muted-foreground">Completed Intakes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{data?.converted || 0}</p>
            <p className="text-xs text-muted-foreground">Conversions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-600">
              {overallConversionRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
