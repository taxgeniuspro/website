'use client';

/**
 * Earnings Overview Card
 *
 * Displays earnings summary with breakdown by status and trends
 * Shows total earnings, pending, approved, and paid commissions
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Wallet,
  Loader2,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  approvedEarnings: number;
  paidEarnings: number;
  totalLeads: number;
  convertedLeads: number;
  averageCommission: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
}

interface EarningsOverviewCardProps {
  className?: string;
  onRequestPayout?: () => void;
}

export function EarningsOverviewCard({ className, onRequestPayout }: EarningsOverviewCardProps) {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/earnings/summary');

      if (!response.ok) {
        throw new Error('Failed to fetch earnings');
      }

      const data = await response.json();
      setEarnings(data);
    } catch (err) {
      logger.error('Failed to fetch earnings summary', { error: err });
      setError(err.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
          <CardDescription>Loading your earnings...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !earnings) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Earnings Overview</CardTitle>
          <CardDescription>Unable to load earnings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">{error || 'No data available'}</p>
            <Button variant="outline" size="sm" onClick={fetchEarnings} className="mt-4">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate month-over-month growth
  const monthGrowth =
    earnings.lastMonthEarnings > 0
      ? ((earnings.thisMonthEarnings - earnings.lastMonthEarnings) / earnings.lastMonthEarnings) *
        100
      : earnings.thisMonthEarnings > 0
        ? 100
        : 0;

  const conversionRate =
    earnings.totalLeads > 0 ? (earnings.convertedLeads / earnings.totalLeads) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Earnings Overview</CardTitle>
            <CardDescription>Your commission earnings and payout status</CardDescription>
          </div>
          <Button onClick={onRequestPayout} disabled={earnings.approvedEarnings === 0}>
            <Wallet className="mr-2 h-4 w-4" />
            Request Payout
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Earnings */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">Total Lifetime Earnings</p>
            <Badge variant="outline" className="text-xs">
              {earnings.convertedLeads} conversions
            </Badge>
          </div>
          <p className="text-4xl font-bold">${earnings.totalEarnings.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-2">
            {monthGrowth >= 0 ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">+{monthGrowth.toFixed(1)}%</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600 dark:text-red-400">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">{monthGrowth.toFixed(1)}%</span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">vs last month</span>
          </div>
        </div>

        {/* This Month */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-bold">${earnings.thisMonthEarnings.toLocaleString()}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Average Commission</p>
            <p className="text-2xl font-bold">${earnings.averageCommission.toFixed(2)}</p>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold text-sm">Earnings by Status</h3>

          {/* Pending */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-yellow-100 dark:bg-yellow-900/30">
                  <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Pending</p>
                  <p className="text-xs text-muted-foreground">Awaiting 30-day approval period</p>
                </div>
              </div>
              <p className="text-sm font-bold">${earnings.pendingEarnings.toLocaleString()}</p>
            </div>
            <Progress
              value={
                earnings.totalEarnings > 0
                  ? (earnings.pendingEarnings / earnings.totalEarnings) * 100
                  : 0
              }
              className="h-2 bg-yellow-100 dark:bg-yellow-900/20"
            />
          </div>

          {/* Approved */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Approved</p>
                  <p className="text-xs text-muted-foreground">Available for payout</p>
                </div>
              </div>
              <p className="text-sm font-bold text-green-600 dark:text-green-400">
                ${earnings.approvedEarnings.toLocaleString()}
              </p>
            </div>
            <Progress
              value={
                earnings.totalEarnings > 0
                  ? (earnings.approvedEarnings / earnings.totalEarnings) * 100
                  : 0
              }
              className="h-2 bg-green-100 dark:bg-green-900/20"
            />
          </div>

          {/* Paid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                  <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Paid</p>
                  <p className="text-xs text-muted-foreground">Successfully paid out</p>
                </div>
              </div>
              <p className="text-sm font-bold">${earnings.paidEarnings.toLocaleString()}</p>
            </div>
            <Progress
              value={
                earnings.totalEarnings > 0
                  ? (earnings.paidEarnings / earnings.totalEarnings) * 100
                  : 0
              }
              className="h-2 bg-blue-100 dark:bg-blue-900/20"
            />
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Leads</span>
            <span className="text-sm font-semibold">{earnings.totalLeads}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Converted Leads</span>
            <span className="text-sm font-semibold">{earnings.convertedLeads}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Conversion Rate</span>
            <Badge variant="outline">{conversionRate.toFixed(1)}%</Badge>
          </div>
        </div>

        {/* Action Link */}
        {earnings.approvedEarnings > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div>
                <p className="text-sm font-medium">Ready to cash out?</p>
                <p className="text-xs text-muted-foreground">
                  ${earnings.approvedEarnings.toLocaleString()} available for withdrawal
                </p>
              </div>
              <Button size="sm" onClick={onRequestPayout}>
                <ArrowUpRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
