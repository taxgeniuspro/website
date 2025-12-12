'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Users } from 'lucide-react';
import type { ClientSourceBreakdown } from '@/lib/services/preparer-analytics.service';

interface ClientSourcesDonutProps {
  data: ClientSourceBreakdown[];
}

export function ClientSourcesDonut({ data }: ClientSourcesDonutProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5" />
            Client Sources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No client data yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          Client Sources
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="h-[160px] w-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as ClientSourceBreakdown;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <p className="font-medium">{item.source}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.count} clients ({item.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.slice(0, 5).map((item) => (
              <div key={item.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.source}</span>
                </div>
                <span className="text-sm font-medium">{item.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 pt-3 border-t text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Total Clients</p>
        </div>
      </CardContent>
    </Card>
  );
}
