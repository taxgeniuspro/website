'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FunnelStage } from '@/lib/utils/analytics';

interface ConversionFunnelChartProps {
  stages: FunnelStage[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

export function ConversionFunnelChart({
  stages,
  title = 'Conversion Funnel',
  subtitle,
  loading = false,
  className,
}: ConversionFunnelChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stages.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No conversion data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxValue = stages[0]?.value || 1;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {stages.map((stage, index) => {
            const widthPercentage = (stage.value / maxValue) * 100;
            const isLast = index === stages.length - 1;

            return (
              <div key={stage.name} className="space-y-2">
                {/* Stage Label and Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-medium">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{stage.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {stage.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Funnel Bar */}
                <div className="relative">
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden h-14 flex items-center">
                    <div
                      className="h-full transition-all duration-500 ease-out flex items-center justify-center text-white font-semibold text-sm rounded-lg"
                      style={{
                        width: `${widthPercentage}%`,
                        backgroundColor: stage.color,
                        minWidth: widthPercentage < 20 ? '20%' : undefined,
                      }}
                    >
                      {widthPercentage > 15 && (
                        <span className="px-2">{stage.value.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Drop-off Arrow and Percentage */}
                {!isLast && stages[index + 1] && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Drop-off:{' '}
                      <span
                        className={cn(
                          'font-medium',
                          stage.value - stages[index + 1].value > 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        )}
                      >
                        {((1 - stages[index + 1].value / stage.value) * 100).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall Conversion Rate */}
        {stages.length > 1 && (
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Conversion Rate</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {((stages[stages.length - 1].value / stages[0].value) * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
