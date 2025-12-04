'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, CheckCircle, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface PreparerStats {
  totalClients: number;
  inProgress: number;
  completed: number;
  awaitingDocuments: number;
  totalRevenue: number;
  averageProcessingTime: number;
}

interface StatsGridProps {
  stats: PreparerStats;
}

const statCards = [
  {
    title: 'Total Clients',
    icon: Users,
    key: 'totalClients' as const,
    suffix: '',
    description: '+12% from last month',
    iconColor: 'text-muted-foreground',
  },
  {
    title: 'In Progress',
    icon: Clock,
    key: 'inProgress' as const,
    suffix: '',
    description: 'Actively working',
    iconColor: 'text-yellow-500',
  },
  {
    title: 'Completed',
    icon: CheckCircle,
    key: 'completed' as const,
    suffix: '',
    description: 'This tax season',
    iconColor: 'text-green-500',
  },
  {
    title: 'Awaiting Docs',
    icon: AlertTriangle,
    key: 'awaitingDocuments' as const,
    suffix: '',
    description: 'Need attention',
    iconColor: 'text-orange-500',
  },
  {
    title: 'Revenue',
    icon: DollarSign,
    key: 'totalRevenue' as const,
    suffix: '',
    description: 'This month',
    iconColor: 'text-muted-foreground',
    formatter: (value: number) => `$${value.toLocaleString()}`,
  },
  {
    title: 'Avg. Time',
    icon: TrendingUp,
    key: 'averageProcessingTime' as const,
    suffix: ' days',
    description: 'Per return',
    iconColor: 'text-muted-foreground',
  },
];

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {statCards.map((card) => {
        const value = stats[card.key];
        const displayValue = card.formatter ? card.formatter(value) : value;

        return (
          <Card key={card.key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayValue}
                {card.suffix}
              </div>
              <p className="text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
