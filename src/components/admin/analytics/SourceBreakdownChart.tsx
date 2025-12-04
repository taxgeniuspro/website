'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SourceData } from '@/lib/utils/source-breakdown';

export type { SourceData };

interface SourceBreakdownChartProps {
  data: SourceData[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  showLegend?: boolean;
}

export function SourceBreakdownChart({
  data,
  title = 'Lead Sources',
  subtitle,
  loading = false,
  className,
  showLegend = true,
}: SourceBreakdownChartProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto w-48"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0 || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No source data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate pie chart segments
  let cumulativePercentage = 0;
  const segments = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const startAngle = (cumulativePercentage * 360) / 100;
    const endAngle = ((cumulativePercentage + percentage) * 360) / 100;
    cumulativePercentage += percentage;

    return {
      ...item,
      startAngle,
      endAngle,
      percentage,
    };
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Donut Chart */}
          <div className="relative flex-shrink-0">
            <svg viewBox="0 0 200 200" className="w-48 h-48 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="100"
                cy="100"
                r="80"
                fill="none"
                stroke="currentColor"
                strokeWidth="40"
                className="text-gray-100 dark:text-gray-800"
              />

              {/* Segments */}
              {segments.map((segment, index) => {
                const radius = 80;
                const circumference = 2 * Math.PI * radius;
                const startAngle = (segment.startAngle * Math.PI) / 180;
                const endAngle = (segment.endAngle * Math.PI) / 180;
                const angleDiff = endAngle - startAngle;

                const strokeDasharray = `${
                  (angleDiff / (2 * Math.PI)) * circumference
                } ${circumference}`;
                const strokeDashoffset = -((segment.startAngle / 360) * circumference);

                return (
                  <circle
                    key={index}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="40"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-300 hover:opacity-80"
                    style={{
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                    }}
                  />
                );
              })}
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold">{total.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Total Leads</div>
            </div>
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="flex-1 space-y-3 w-full">
              {segments.map((segment) => (
                <div
                  key={segment.name}
                  className="flex items-center justify-between gap-4 p-2 rounded hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="text-sm font-medium truncate">{segment.name}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-sm font-semibold">{segment.value.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {segment.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
