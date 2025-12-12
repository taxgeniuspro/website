'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { TodayScheduleData } from '@/lib/services/preparer-analytics.service';

interface TodayScheduleCardProps {
  data: TodayScheduleData;
}

export function TodayScheduleCard({ data }: TodayScheduleCardProps) {
  const stats = [
    {
      label: 'Scheduled',
      value: data.scheduled,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Pending',
      value: data.pending,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Completed',
      value: data.completed,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5" />
          Today&apos;s Schedule
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/tax-preparer/calendar">
            View Calendar
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg p-4 text-center ${stat.bgColor}`}
            >
              <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
        {data.cancelled > 0 && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <XCircle className="h-4 w-4 text-red-500" />
            {data.cancelled} cancelled/no-show today
          </div>
        )}
      </CardContent>
    </Card>
  );
}
