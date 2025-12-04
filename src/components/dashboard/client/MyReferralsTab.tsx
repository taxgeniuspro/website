'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp } from 'lucide-react';
import { AttributionStatsCard } from '../attribution-stats-card';
import { RecentLeadsTable } from '../recent-leads-table';
// Removed EarningsOverviewCard - earnings feature disabled for clients
// Removed PayoutRequestDialog - payouts feature disabled for clients
import { ReferralLinksManager } from '../ReferralLinksManager';

interface MyReferralsTabProps {
  totalLeads?: number;
}

export function MyReferralsTab({ totalLeads = 0 }: MyReferralsTabProps) {
  return (
    <div className="space-y-6">
      {/* Referral Links Section */}
      <Card>
        <CardHeader>
          <CardTitle>Share & Earn</CardTitle>
          <CardDescription>
            Share your referral links to earn commissions when people sign up
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralLinksManager />
        </CardContent>
      </Card>

      {/* EPIC 6: Attribution Analytics */}
      <AttributionStatsCard period="30d" />

      {/* Quick Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
          <CardDescription>Your referral performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold">{totalLeads}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EPIC 6: Recent Leads with Attribution */}
      <RecentLeadsTable limit={10} />
    </div>
  );
}
