'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LeadDashboard } from '@/components/crm/LeadDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { TableSkeleton, CardSkeleton } from '@/components/SkeletonPatterns';
import { Breadcrumbs } from '@/components/Breadcrumbs';

/**
 * Tax Preparer Leads Page
 * /dashboard/tax-preparer/leads
 *
 * Displays all leads assigned to the authenticated tax preparer
 * Integrated with CRM for contact management
 */
export default function TaxPreparerLeadsPage() {
  const { data: session, status } = useSession(); const user = session?.user; const isLoaded = status !== 'loading';
  const [preparerId, setPreparerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPreparerProfile() {
      if (!isLoaded || !user) return;

      try {
        // Fetch the preparer's profile to get their database ID
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          setPreparerId(data.profile?.id || null);
        } else {
          logger.error('Failed to fetch preparer profile');
        }
      } catch (error) {
        logger.error('Error fetching preparer profile:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchPreparerProfile();
  }, [user, isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
        {/* Header Skeleton */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-28 rounded-md bg-muted animate-pulse" />
            <div className="h-8 w-32 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="h-5 w-64 rounded-md bg-muted animate-pulse" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>

        {/* Lead Table */}
        <TableSkeleton rows={8} columns={6} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tax-preparer">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold">My Leads</h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and convert your assigned leads to clients
          </p>
        </div>
      </div>

      {/* Lead Dashboard Component */}
      {preparerId ? (
        <LeadDashboard preparerId={preparerId} isAdmin={false} />
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Unable to load leads. Please try refreshing the page.</p>
        </div>
      )}
    </div>
  );
}
