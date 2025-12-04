'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, FileCheck, Sparkles, ShoppingCart, Palette, FileText, Calendar } from 'lucide-react';
import { AttributionStatsCard } from '@/components/dashboard/attribution-stats-card';
import { RecentLeadsTable } from '@/components/dashboard/recent-leads-table';
import { StatsGrid } from '@/components/dashboard/preparer/StatsGrid';
import { OverviewTab } from '@/components/dashboard/preparer/OverviewTab';
import { getPriorityColor } from '@/components/dashboard/preparer/utils';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { StatsWidget } from '@/components/gamification/StatsWidget';
import { useSession } from 'next-auth/react';
import { RecentItemsCard } from '@/components/RecentItems';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { UserRole } from '@/lib/permissions';

// Types
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  taxYear: number;
  status: 'DRAFT' | 'IN_REVIEW' | 'FILED' | 'ACCEPTED' | 'REJECTED' | 'AMENDED';
  documentsCount: number;
  lastActivity: string;
  assignedDate: string;
  dueDate: string;
  refundAmount?: number;
  oweAmount?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

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

  // Mock data
  const stats: PreparerStats = {
    totalClients: 47,
    inProgress: 12,
    completed: 31,
    awaitingDocuments: 4,
    totalRevenue: 7050,
    averageProcessingTime: 3.5,
  };

  const clients: Client[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '(555) 123-4567',
      taxYear: 2023,
      status: 'IN_REVIEW',
      documentsCount: 5,
      lastActivity: '2 hours ago',
      assignedDate: '2024-01-10',
      dueDate: '2024-02-15',
      refundAmount: 2500,
      priority: 'HIGH',
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '(555) 234-5678',
      taxYear: 2023,
      status: 'DRAFT',
      documentsCount: 3,
      lastActivity: '1 day ago',
      assignedDate: '2024-01-12',
      dueDate: '2024-02-20',
      oweAmount: 1200,
      priority: 'MEDIUM',
    },
    {
      id: '3',
      name: 'Michael Brown',
      email: 'mbrown@email.com',
      phone: '(555) 345-6789',
      taxYear: 2023,
      status: 'ACCEPTED',
      documentsCount: 8,
      lastActivity: '3 days ago',
      assignedDate: '2024-01-05',
      dueDate: '2024-02-10',
      refundAmount: 3800,
      priority: 'LOW',
    },
  ];

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

      {/* Gamification Widget */}
      {user && <StatsWidget userId={user.id} role="tax_preparer" compact={true} />}

      {/* Stats Grid */}
      <StatsGrid stats={stats} />

      {/* Recent Items - Quick Access to recently viewed items */}
      <RecentItemsCard
        title="Recently Accessed"
        maxItems={5}
        showEmpty={false}
      />

      {/* Quick Access */}
      <Card className="bg-blue-50 dark:bg-blue-950/50 border-blue-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Quick Access
          </CardTitle>
          <CardDescription>Your most important tools and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/dashboard/tax-preparer/calendar">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Calendar className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">My Calendar</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Appointments</p>
                </div>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/dashboard/tax-preparer/analytics">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">My Analytics</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Track performance</p>
                </div>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/dashboard/tax-preparer/tracking">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">My Tracking Code</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Referral link</p>
                </div>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/dashboard/tax-preparer/forms">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">Tax Forms</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Share with clients</p>
                </div>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/app/academy">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">Academy</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">6 training videos</p>
                </div>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/store">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">Store</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Marketing materials</p>
                </div>
              </a>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 sm:gap-3 py-4 sm:py-6 bg-white dark:bg-gray-950 hover:shadow-lg transition-all"
              asChild
            >
              <a href="/dashboard/tax-preparer/settings">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gray-100 dark:bg-gray-900/30 flex items-center justify-center">
                  <Palette className="h-6 w-6 sm:h-7 sm:w-7 text-gray-600" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-xs sm:text-sm">Settings</p>
                  <p className="text-xs text-muted-foreground mt-1 hidden sm:block">Account & profile</p>
                </div>
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Links Manager */}
      <ReferralLinksManager />

      {/* Overview Content */}
      <OverviewTab clients={clients} getPriorityColor={getPriorityColor} />

      {/* Attribution Stats */}
      <AttributionStatsCard period="30d" />

      {/* Recent Leads */}
      <RecentLeadsTable limit={10} />
      </div>
    </>
  );
}
