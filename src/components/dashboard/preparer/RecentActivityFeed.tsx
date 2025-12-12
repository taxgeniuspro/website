'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  MousePointerClick,
  FileText,
  CalendarCheck,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import type { RecentActivityItem } from '@/lib/services/preparer-analytics.service';

interface RecentActivityFeedProps {
  data: RecentActivityItem[];
}

const activityIcons = {
  link_click: MousePointerClick,
  intake_submitted: FileCheck,
  intake_started: FileText,
  appointment_booked: CalendarCheck,
  return_filed: FileCheck,
};

const activityColors = {
  link_click: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
  intake_submitted: 'text-green-500 bg-green-100 dark:bg-green-900/30',
  intake_started: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
  appointment_booked: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  return_filed: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
};

export function RecentActivityFeed({ data }: RecentActivityFeedProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Activity will appear here as clients engage</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/tax-preparer/leads">
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {data.map((activity) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityColors[activity.type];

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`p-2 rounded-full ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.timeAgo}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
