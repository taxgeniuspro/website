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
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 text-blue-700 dark:text-blue-300',
    green:
      'from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 text-green-700 dark:text-green-300',
    purple:
      'from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 text-purple-700 dark:text-purple-300',
    yellow:
      'from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 text-yellow-700 dark:text-yellow-300',
    orange:
      'from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 text-orange-700 dark:text-orange-300',
    gray: 'from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-gray-200 text-gray-700 dark:text-gray-300',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    orange: 'text-orange-600 dark:text-orange-400',
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
