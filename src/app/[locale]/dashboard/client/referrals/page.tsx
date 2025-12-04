'use client';

/**
 * Client Referrals & Earnings Page
 *
 * Unified dashboard showing:
 * - Earnings overview (total earned, paid, owed)
 * - Referral performance metrics
 * - Link performance comparison
 * - Traffic sources analysis
 * - Detailed leads table
 */

import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, Users, Target, Link as LinkIcon } from 'lucide-react';
import { EarningsOverviewCard } from '@/components/dashboard/client/EarningsOverviewCard';
import { LinkPerformanceCard } from '@/components/dashboard/client/LinkPerformanceCard';
import { TrafficSourcesCard } from '@/components/dashboard/client/TrafficSourcesCard';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { AttributionStatsCard } from '@/components/dashboard/attribution-stats-card';
import { RecentLeadsTable } from '@/components/dashboard/recent-leads-table';

export default function ClientReferralsPage() {
  // Fetch earnings data
  const { data: earningsData, isLoading: earningsLoading } = useQuery({
    queryKey: ['client-earnings'],
    queryFn: async () => {
      const response = await fetch('/api/client/earnings');
      if (!response.ok) throw new Error('Failed to fetch earnings data');
      return response.json();
    },
  });

  if (earningsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const {
    totalEarned = 0,
    paidOut = 0,
    amountOwed = 0,
    thisMonth = 0,
    totalLeads = 0,
    completedReturns = 0,
    successRate = 0,
    activeLinks = 0,
    linkPerformance,
    trafficSources = [],
  } = earningsData || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Referral Earnings & Performance
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track your earnings, referrals, and link performance
          </p>
        </div>

        {/* Earnings Overview - Hero Section */}
        <EarningsOverviewCard
          totalEarned={totalEarned}
          paidOut={paidOut}
          amountOwed={amountOwed}
          thisMonth={thisMonth}
        />

        {/* Performance Metrics Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">People Referred</p>
                  <p className="text-2xl font-bold">{totalLeads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Returns</p>
                  <p className="text-2xl font-bold">{completedReturns}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                  <LinkIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Links</p>
                  <p className="text-2xl font-bold">{activeLinks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral Links Manager */}
        <Card>
          <CardContent className="pt-6">
            <ReferralLinksManager />
          </CardContent>
        </Card>

        {/* Link Performance Breakdown */}
        {linkPerformance && (
          <LinkPerformanceCard
            intakeLink={linkPerformance.intakeLink}
            appointmentLink={linkPerformance.appointmentLink}
          />
        )}

        {/* Traffic Sources */}
        <TrafficSourcesCard sources={trafficSources} />

        {/* Attribution Analytics */}
        <AttributionStatsCard period="30d" />

        {/* Detailed Leads Table */}
        <RecentLeadsTable limit={100} />

        {/* Help Alert */}
        {totalLeads === 0 && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              <strong>Get started:</strong> Share your referral links above with friends and family
              to start earning commissions. You'll earn money when they file their taxes with us!
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
