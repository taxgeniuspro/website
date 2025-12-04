'use client';

import { type LucideIcon } from 'lucide-react';
import { LeadMetricCard } from './LeadMetricCard';

export interface MetricCardData {
  title: string;
  value: number | string;
  growthRate?: number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'gray';
  format?: 'number' | 'currency' | 'percent';
  subtitle?: string;
  loading?: boolean;
}

interface MetricsGridProps {
  metrics: MetricCardData[];
  columns?: 2 | 3 | 4;
}

export function MetricsGrid({ metrics, columns = 4 }: MetricsGridProps) {
  const gridClass =
    columns === 2
      ? 'md:grid-cols-2'
      : columns === 3
        ? 'md:grid-cols-2 lg:grid-cols-3'
        : 'md:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {metrics.map((metric, index) => (
        <LeadMetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          growthRate={metric.growthRate}
          icon={metric.icon}
          color={metric.color}
          format={metric.format}
          subtitle={metric.subtitle}
          loading={metric.loading}
        />
      ))}
    </div>
  );
}
