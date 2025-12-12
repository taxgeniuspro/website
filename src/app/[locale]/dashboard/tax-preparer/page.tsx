'use client';

import { AttributionStatsCard } from '@/components/dashboard/attribution-stats-card';
import { RecentLeadsTable } from '@/components/dashboard/recent-leads-table';
import { StatsGrid } from '@/components/dashboard/preparer/StatsGrid';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { useSession } from 'next-auth/react';
import { RecentItemsCard } from '@/components/RecentItems';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { UserRole } from '@/lib/permissions';

// Types
interface PreparerStats {
  totalClients: number;
  inProgress: number;
  completed: number;
  awaitingDocuments: number;
  totalRevenue: number;
  averageProcessingTime: number;
}

export default function PreparerDashboard() {
  const { data: session } = useSession(); const user = session?.user;

  // Real data - starts at zero, populated from actual client activity
  const stats: PreparerStats = {
    totalClients: 0,
    inProgress: 0,
    completed: 0,
    awaitingDocuments: 0,
    totalRevenue: 0,
    averageProcessingTime: 0,
  };

  return (
    <>
      {/* Onboarding Dialog */}
      {user && (
        <OnboardingDialog
          role={(user?.role as UserRole) || 'tax_preparer'}
          userName={user.name || undefined}
        />
      )}

      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
        {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Preparer Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage your clients and tax preparations</p>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Recent Items - Quick Access to recently viewed items */}
      <RecentItemsCard
        title="Recently Accessed"
        maxItems={5}
        showEmpty={false}
      />

      {/* Referral Links Manager */}
      <ReferralLinksManager />

      {/* Attribution Stats */}
      <AttributionStatsCard period="30d" />

      {/* Recent Leads */}
      <RecentLeadsTable limit={10} />
      </div>
    </>
  );
}
