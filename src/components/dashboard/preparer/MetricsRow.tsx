'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MousePointerClick, FileText, CalendarCheck, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricWithTrend } from '@/lib/services/preparer-analytics.service';

interface MetricsRowProps {
  linkClicks: MetricWithTrend;
  intakeForms: MetricWithTrend;
  appointmentsBooked: MetricWithTrend;
  earnings: MetricWithTrend;
}

interface MetricCardProps {
  title: string;
  metric: MetricWithTrend;
  icon: React.ElementType;
  iconColor: string;
  formatter?: (value: number) => string;
}

function MetricCard({ title, metric, icon: Icon, iconColor, formatter }: MetricCardProps) {
  const displayValue = formatter ? formatter(metric.value) : metric.value.toLocaleString();

  const TrendIcon = metric.trendDirection === 'up'
    ? TrendingUp
    : metric.trendDirection === 'down'
      ? TrendingDown
      : Minus;

  const trendColor = metric.trendDirection === 'up'
    ? 'text-green-500'
    : metric.trendDirection === 'down'
      ? 'text-red-500'
      : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
        <div className="flex items-center gap-1 mt-1">
          <TrendIcon className={`h-3 w-3 ${trendColor}`} />
          <span className={`text-xs ${trendColor}`}>
            {metric.trend}% vs yesterday
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsRow({ linkClicks, intakeForms, appointmentsBooked, earnings }: MetricsRowProps) {
  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
      <MetricCard
        title="Link Clicks"
        metric={linkClicks}
        icon={MousePointerClick}
        iconColor="text-purple-500"
      />
      <MetricCard
        title="Intake Forms"
        metric={intakeForms}
        icon={FileText}
        iconColor="text-blue-500"
      />
      <MetricCard
        title="Appts Booked"
        metric={appointmentsBooked}
        icon={CalendarCheck}
        iconColor="text-green-500"
      />
      <MetricCard
        title="Earned Today"
        metric={earnings}
        icon={DollarSign}
        iconColor="text-amber-500"
        formatter={(value) => `$${value.toLocaleString()}`}
      />
    </div>
  );
}
