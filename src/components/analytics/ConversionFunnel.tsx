/**
 * Conversion Funnel Component
 *
 * Visualizes 4-stage customer journey with drop-off analysis
 * Stages: Clicked → Intake Started → Intake Completed → Return Filed
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6.4
 */

'use client';

import { useConversionFunnel } from '@/hooks/useMyMaterials';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversionFunnelProps {
  materialId?: string;
  dateRange?: string;
  className?: string;
}

export function ConversionFunnel({
  materialId,
  dateRange = 'all',
  className,
}: ConversionFunnelProps) {
  const { data, isLoading, error } = useConversionFunnel({
    materialId,
    dateRange,
  });

  if (isLoading) {
    return <FunnelSkeleton className={className} />;
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">Failed to load funnel data</p>
        </CardContent>
      </Card>
    );
  }

  const funnel = data?.funnel;

  if (!funnel) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">
          Track customer journey from click to tax return filed
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Stage 1: Clicks */}
          <FunnelStage label="Link Clicked" count={funnel.stage1_clicks} percentage={100} isFirst />

          <FunnelDropoff
            rate={funnel.dropoff.clickToStart}
            conversionRate={funnel.conversionRates.clickToStart}
          />

          {/* Stage 2: Intake Started */}
          <FunnelStage
            label="Started Intake Form"
            count={funnel.stage2_intakeStarts}
            percentage={funnel.conversionRates.clickToStart}
          />

          <FunnelDropoff
            rate={funnel.dropoff.startToComplete}
            conversionRate={funnel.conversionRates.startToComplete}
          />

          {/* Stage 3: Intake Completed */}
          <FunnelStage
            label="Completed Intake Form"
            count={funnel.stage3_intakeCompletes}
            percentage={funnel.conversionRates.startToComplete}
          />

          <FunnelDropoff
            rate={funnel.dropoff.completeToFiled}
            conversionRate={funnel.conversionRates.completeToFiled}
          />

          {/* Stage 4: Return Filed */}
          <FunnelStage
            label="Tax Return Filed"
            count={funnel.stage4_returnsFiled}
            percentage={funnel.conversionRates.completeToFiled}
            isLast
          />

          {/* Overall Conversion Summary */}
          <div className="pt-4 mt-4 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">
                Overall Conversion Rate:
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'text-2xl font-bold',
                    funnel.conversionRates.overallConversion > 10
                      ? 'text-green-600'
                      : funnel.conversionRates.overallConversion > 5
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  )}
                >
                  {funnel.conversionRates.overallConversion.toFixed(1)}%
                </span>
                {funnel.conversionRates.overallConversion > 10 && (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {funnel.stage4_returnsFiled} of {funnel.stage1_clicks} clicks resulted in filed tax
              returns
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FunnelStageProps {
  label: string;
  count: number;
  percentage: number;
  isFirst?: boolean;
  isLast?: boolean;
}

function FunnelStage({ label, count, percentage, isFirst, isLast }: FunnelStageProps) {
  const widthPercentage = isFirst ? 100 : percentage;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {count.toLocaleString()} {!isFirst && `(${percentage.toFixed(1)}%)`}
        </span>
      </div>
      <div className="h-12 bg-secondary/20 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div
          className={cn(
            'absolute left-0 top-0 h-full transition-all duration-500',
            isLast ? 'bg-green-500' : isFirst ? 'bg-blue-500' : 'bg-blue-400'
          )}
          style={{ width: `${widthPercentage}%` }}
        />
        <span className="relative z-10 font-semibold text-foreground">
          {count.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

interface FunnelDropoffProps {
  rate: number;
  conversionRate: number;
}

function FunnelDropoff({ rate, conversionRate }: FunnelDropoffProps) {
  return (
    <div className="flex items-center justify-center gap-4 text-xs">
      <div className="flex items-center text-red-600">
        <TrendingDown className="w-3 h-3 mr-1" />
        <span className="font-medium">{rate.toFixed(1)}% drop-off</span>
      </div>
      <div className="h-3 w-px bg-border" />
      <div className="flex items-center text-green-600">
        <TrendingUp className="w-3 h-3 mr-1" />
        <span className="font-medium">{conversionRate.toFixed(1)}% converted</span>
      </div>
    </div>
  );
}

function FunnelSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-12 w-full" />
            {i < 3 && <Skeleton className="h-4 w-48 mx-auto mt-2" />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
