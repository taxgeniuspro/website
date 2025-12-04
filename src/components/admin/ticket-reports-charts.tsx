'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

interface TicketReportsChartsProps {
  type: 'overview' | 'performance' | 'trends';
}

export function TicketReportsCharts({ type }: TicketReportsChartsProps) {
  if (type === 'overview') {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Status</CardTitle>
            <CardDescription>Current distribution of ticket statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Open</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: '25%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">45</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">In Progress</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-yellow-500 h-3 rounded-full" style={{ width: '35%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">67</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Waiting Client</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: '15%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">28</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Resolved</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: '65%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">124</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Priority</CardTitle>
            <CardDescription>Priority distribution of active tickets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Urgent</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-red-500 h-3 rounded-full" style={{ width: '8%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">12</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">High</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-orange-500 h-3 rounded-full" style={{ width: '22%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">34</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Normal</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: '55%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">85</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Low</span>
                <div className="flex items-center gap-2">
                  <div className="w-48 bg-muted rounded-full h-3">
                    <div className="bg-gray-500 h-3 rounded-full" style={{ width: '15%' }} />
                  </div>
                  <span className="text-sm font-medium w-12 text-right">23</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (type === 'performance') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Over Time</CardTitle>
          <CardDescription>Response and resolution times (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
              <p className="text-sm">Chart visualization would display here</p>
              <p className="text-xs">Integration with charting library pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Trends
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Volume Trends</CardTitle>
        <CardDescription>Ticket creation over time (last 90 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm">Trend chart visualization would display here</p>
            <p className="text-xs">Integration with charting library pending</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
