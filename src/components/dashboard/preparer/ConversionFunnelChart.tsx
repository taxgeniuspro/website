'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingDown } from 'lucide-react';
import type { ConversionFunnelStage } from '@/lib/services/preparer-analytics.service';

interface ConversionFunnelChartProps {
  data: ConversionFunnelStage[];
  period?: 'today' | 'week' | 'month';
}

export function ConversionFunnelChart({ data, period = 'today' }: ConversionFunnelChartProps) {
  const periodLabel = period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month';

  // Calculate overall conversion rate (first to last stage)
  const overallConversion = data.length > 1 && data[0].value > 0
    ? Math.round((data[data.length - 1].value / data[0].value) * 100)
    : 0;

  if (data.length === 0 || data.every(d => d.value === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Conversion Funnel
          </CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No data yet for {periodLabel.toLowerCase()}</p>
            <p className="text-xs">Share your links to start tracking conversions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Conversion Funnel
            </CardTitle>
            <CardDescription>{periodLabel}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{overallConversion}%</p>
            <p className="text-xs text-muted-foreground">Overall conversion</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                width={95}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as ConversionFunnelStage;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.value.toLocaleString()} ({item.percentage}%)
                        </p>
                        {item.dropOffRate > 0 && (
                          <p className="text-xs text-red-500">
                            -{item.dropOffRate}% drop-off
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend with drop-off rates */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          {data.map((stage, index) => (
            <div key={stage.name} className="text-center">
              <div
                className="h-2 rounded-full mb-1"
                style={{ backgroundColor: stage.color }}
              />
              <p className="text-xs font-medium">{stage.value}</p>
              {index > 0 && stage.dropOffRate > 0 && (
                <p className="text-xs text-red-500">-{stage.dropOffRate}%</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
