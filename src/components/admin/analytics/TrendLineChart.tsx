'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface TrendLine {
  name: string;
  data: TrendDataPoint[];
  color: string;
}

interface TrendLineChartProps {
  lines: TrendLine[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  className?: string;
  valueFormat?: 'number' | 'currency' | 'percent';
  showLegend?: boolean;
  showGrid?: boolean;
}

export function TrendLineChart({
  lines,
  title = 'Trend Analysis',
  subtitle,
  loading = false,
  className,
  valueFormat = 'number',
  showLegend = true,
  showGrid = true,
}: TrendLineChartProps) {
  const { maxValue, minValue, chartHeight, chartWidth } = useMemo(() => {
    const allValues = lines.flatMap((line) => line.data.map((d) => d.value));
    const max = Math.max(...allValues, 0);
    const min = Math.min(...allValues, 0);
    return {
      maxValue: max * 1.1, // Add 10% padding
      minValue: min < 0 ? min * 1.1 : 0,
      chartHeight: 300,
      chartWidth: 600,
    };
  }, [lines]);

  const formatValue = (value: number): string => {
    switch (valueFormat) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const getYPosition = (value: number): number => {
    const range = maxValue - minValue;
    const ratio = (maxValue - value) / range;
    return ratio * chartHeight;
  };

  const getXPosition = (index: number, totalPoints: number): number => {
    return (index / (totalPoints - 1)) * chartWidth;
  };

  const createLinePath = (dataPoints: TrendDataPoint[]): string => {
    if (dataPoints.length === 0) return '';

    return dataPoints
      .map((point, index) => {
        const x = getXPosition(index, dataPoints.length);
        const y = getYPosition(point.value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (lines.length === 0 || lines.every((line) => line.data.length === 0)) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>No trend data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get x-axis labels from the first line with data
  const xAxisLabels = lines.find((line) => line.data.length > 0)?.data || [];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth + 60} ${chartHeight + 60}`}
              className="w-full"
              style={{ minHeight: '300px' }}
            >
              {/* Grid lines */}
              {showGrid && (
                <g className="text-gray-200 dark:text-gray-700">
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = ratio * chartHeight + 20;
                    const value = maxValue - ratio * (maxValue - minValue);
                    return (
                      <g key={ratio}>
                        <line
                          x1="40"
                          y1={y}
                          x2={chartWidth + 40}
                          y2={y}
                          stroke="currentColor"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                        <text
                          x="35"
                          y={y + 4}
                          textAnchor="end"
                          className="text-xs fill-muted-foreground"
                        >
                          {formatValue(value)}
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Lines */}
              <g transform={`translate(40, 20)`}>
                {lines.map((line, lineIndex) => {
                  const path = createLinePath(line.data);
                  return (
                    <g key={lineIndex}>
                      {/* Line */}
                      <path
                        d={path}
                        fill="none"
                        stroke={line.color}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-300"
                      />

                      {/* Data points */}
                      {line.data.map((point, pointIndex) => {
                        const x = getXPosition(pointIndex, line.data.length);
                        const y = getYPosition(point.value);
                        return (
                          <g key={pointIndex}>
                            <circle
                              cx={x}
                              cy={y}
                              r="4"
                              fill={line.color}
                              className="transition-all duration-300 hover:r-6"
                            />
                            {/* Tooltip on hover */}
                            <title>
                              {line.name}: {formatValue(point.value)}
                              {point.label && ` (${point.label})`}
                            </title>
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>

              {/* X-axis labels */}
              <g transform={`translate(40, ${chartHeight + 20})`}>
                {xAxisLabels.map((point, index) => {
                  const x = getXPosition(index, xAxisLabels.length);
                  return (
                    <text
                      key={index}
                      x={x}
                      y="20"
                      textAnchor="middle"
                      className="text-xs fill-muted-foreground"
                    >
                      {point.label || point.date}
                    </text>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Legend */}
          {showLegend && lines.length > 1 && (
            <div className="flex flex-wrap gap-4 justify-center pt-4 border-t">
              {lines.map((line) => (
                <div key={line.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: line.color }} />
                  <span className="text-sm font-medium">{line.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to generate trend data for a period
export function generateTrendData(
  period: '7d' | '30d' | '90d',
  dataPoints: { date: Date; value: number }[]
): TrendDataPoint[] {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const now = new Date();
  const result: TrendDataPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const value = dataPoints
      .filter((dp) => {
        const dpDate = new Date(dp.date);
        dpDate.setHours(0, 0, 0, 0);
        return dpDate.getTime() === date.getTime();
      })
      .reduce((sum, dp) => sum + dp.value, 0);

    result.push({
      date: date.toISOString(),
      value,
      label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }

  return result;
}
