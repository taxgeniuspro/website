'use client';

/**
 * Earnings Overview Card
 *
 * Displays a hero section with key earnings metrics:
 * - Total Earned (all-time commissions)
 * - Paid Out (money already transferred)
 * - Amount Owed (pending commissions)
 * - This Month (current month earnings)
 */

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EarningsOverviewCardProps {
  totalEarned: number;
  paidOut: number;
  amountOwed: number;
  thisMonth: number;
  className?: string;
}

const STAT_CONFIGS = [
  {
    key: 'totalEarned' as const,
    label: 'Total Earned',
    icon: DollarSign,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    description: 'All-time commission earnings',
  },
  {
    key: 'paidOut' as const,
    label: 'Paid Out',
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    description: 'Money already transferred',
  },
  {
    key: 'amountOwed' as const,
    label: 'Amount Owed',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/20',
    description: 'Pending commissions',
  },
  {
    key: 'thisMonth' as const,
    label: 'This Month',
    icon: Calendar,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    description: 'Current month earnings',
  },
];

export function EarningsOverviewCard({
  totalEarned,
  paidOut,
  amountOwed,
  thisMonth,
  className,
}: EarningsOverviewCardProps) {
  const stats = {
    totalEarned,
    paidOut,
    amountOwed,
    thisMonth,
  };

  return (
    <Card className={cn('border-2', className)}>
      <CardContent className="pt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STAT_CONFIGS.map((config) => {
            const Icon = config.icon;
            const value = stats[config.key];

            return (
              <div
                key={config.key}
                className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={cn('p-3 rounded-lg', config.bgColor)}>
                  <Icon className={cn('h-6 w-6', config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">{config.label}</p>
                  <p className="text-2xl font-bold tracking-tight">
                    $
                    {value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Summary */}
        {amountOwed > 0 && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Payout Pending
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You have ${amountOwed.toFixed(2)} in pending commissions. Payouts are processed
                  monthly for amounts over $50.
                </p>
              </div>
            </div>
          </div>
        )}

        {amountOwed === 0 && paidOut > 0 && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  All Caught Up!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  All your commissions have been paid out. Keep referring to earn more!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
