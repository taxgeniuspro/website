'use client';

import { Eye, MousePointerClick, CheckCircle2, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserRole } from '@/lib/permissions';

interface StatsOverviewProps {
  stats: any;
  loading: boolean;
  role: UserRole;
}

export function StatsOverview({ stats, loading, role }: StatsOverviewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 px-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  const getStatsForRole = () => {
    switch (role) {
      case 'tax_preparer':
        return [
          {
            label: 'Link Views',
            value: stats?.linkViews || 0,
            icon: Eye,
            color: 'text-blue-500',
          },
          {
            label: 'Link Clicks',
            value: stats?.linkClicks || 0,
            icon: MousePointerClick,
            color: 'text-green-500',
          },
          {
            label: 'Forms Started',
            value: stats?.formsStarted || 0,
            icon: TrendingUp,
            color: 'text-orange-500',
          },
          {
            label: 'Forms Completed',
            value: stats?.formsCompleted || 0,
            icon: CheckCircle2,
            color: 'text-purple-500',
          },
        ];
      case 'affiliate':
        return [
          {
            label: 'Link Clicks',
            value: stats?.linkClicks || 0,
            icon: MousePointerClick,
            color: 'text-blue-500',
          },
          {
            label: 'Referrals',
            value: stats?.referrals || 0,
            icon: TrendingUp,
            color: 'text-green-500',
          },
          {
            label: 'Conversions',
            value: stats?.conversions || 0,
            icon: CheckCircle2,
            color: 'text-orange-500',
          },
          {
            label: 'Earnings',
            value: `$${stats?.earnings || 0}`,
            icon: TrendingUp,
            color: 'text-purple-500',
          },
        ];
      case 'client':
        return [
          {
            label: 'Documents',
            value: stats?.documents || 0,
            icon: Eye,
            color: 'text-blue-500',
          },
          {
            label: 'Messages',
            value: stats?.messages || 0,
            icon: MousePointerClick,
            color: 'text-green-500',
          },
          {
            label: 'Status',
            value: stats?.status || 'Pending',
            icon: CheckCircle2,
            color: 'text-orange-500',
            isText: true,
          },
          {
            label: 'Referrals',
            value: stats?.referrals || 0,
            icon: TrendingUp,
            color: 'text-purple-500',
          },
        ];
      default:
        return [];
    }
  };

  const statsToShow = getStatsForRole();

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {statsToShow.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {stat.isText ? stat.value : stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
