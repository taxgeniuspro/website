'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowUp,
  ArrowDown,
  MousePointerClick,
  UserPlus,
  FileCheck,
  DollarSign,
  Link2,
  TrendingUp,
  Award,
  Clock,
  Target,
  Zap,
  Users,
  Gift,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'mouse-pointer-click': MousePointerClick,
  'user-plus': UserPlus,
  'file-check': FileCheck,
  'dollar-sign': DollarSign,
  'link-2': Link2,
  'trending-up': TrendingUp,
  award: Award,
  clock: Clock,
  target: Target,
  zap: Zap,
  users: Users,
  gift: Gift,
};

interface LeadMetricCardProps {
  title: string;
  value: number | string;
  growthRate?: number;
  icon: LucideIcon | string;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'gray';
  format?: 'number' | 'currency' | 'percent';
  subtitle?: string;
  loading?: boolean;
}

export function LeadMetricCard({
  title,
  value,
  growthRate,
  icon,
  color = 'blue',
  format = 'number',
  subtitle,
  loading = false,
}: LeadMetricCardProps) {
  // Resolve icon - support both string names and direct components
  const Icon = typeof icon === 'string' ? iconMap[icon] || DollarSign : icon;
  // Tax Genius Pro brand colors:
  // Primary: Yellow (#f9d938)
  // Secondary: Green (#408851)
  // Accent: Dark blue-gray (#30394b)
  const colorClasses = {
    // Brand primary - Yellow
    blue: 'from-amber-50 to-yellow-100 dark:from-amber-950/50 dark:to-yellow-900/50 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
    // Brand secondary - Green
    green:
      'from-emerald-50 to-green-100 dark:from-emerald-950/50 dark:to-green-900/50 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
    // Accent - Slate/dark blue-gray
    purple:
      'from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200',
    // Brand primary variant - Warm yellow
    yellow:
      'from-yellow-50 to-amber-100 dark:from-yellow-950/50 dark:to-amber-900/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200',
    // Brand secondary variant - Teal green
    orange:
      'from-teal-50 to-emerald-100 dark:from-teal-950/50 dark:to-emerald-900/50 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200',
    // Neutral
    gray: 'from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300',
  };

  const iconColorClasses = {
    blue: 'text-yellow-600 dark:text-yellow-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-slate-600 dark:text-slate-400',
    yellow: 'text-amber-600 dark:text-amber-400',
    orange: 'text-teal-600 dark:text-teal-400',
    gray: 'text-gray-600 dark:text-gray-400',
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
      default:
        return val.toLocaleString();
    }
  };

  return (
    <Card className={cn('bg-gradient-to-br', colorClasses[color])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn('w-4 h-4', iconColorClasses[color])} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'text-3xl font-bold',
                colorClasses[color].split(' ').slice(-2).join(' ')
              )}
            >
              {formatValue(value)}
            </div>
            {(growthRate !== undefined || subtitle) && (
              <div className="flex items-center gap-2 mt-2">
                {growthRate !== undefined && (
                  <div
                    className={cn(
                      'flex items-center text-xs font-medium',
                      growthRate >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {growthRate >= 0 ? (
                      <ArrowUp className="w-3 h-3 mr-1" />
                    ) : (
                      <ArrowDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(growthRate)}%
                  </div>
                )}
                {subtitle && (
                  <p className={cn('text-xs font-medium', iconColorClasses[color])}>{subtitle}</p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
