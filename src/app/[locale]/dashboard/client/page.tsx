'use client';

import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  DollarSign,
  CalendarIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { UserRole } from '@/lib/permissions';

export default function ClientDashboard() {
  const { data: session } = useSession(); const user = session?.user;
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/client/dashboard');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Failed to load' }));
        throw new Error(errData.error || 'Failed to load dashboard');
      }
      return res.json();
    },
    retry: false,
  });

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full sm:w-96" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome to Tax Genius Pro
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Setting up your account...
            </p>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Setup in Progress</AlertTitle>
            <AlertDescription>
              We're preparing your dashboard. Please refresh this page in a moment. If this issue
              persists, please contact our support team.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const taxReturn = data?.currentReturn;
  const stats = data?.stats;
  const referralStats = data?.referralStats;

  return (
    <>
      {/* Onboarding Dialog */}
      {user && (
        <OnboardingDialog
          role={(user?.role as UserRole) || 'client'}
          userName={user.name || undefined}
        />
      )}

      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          {/* Header Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {taxReturn ? 'Welcome Back!' : 'Welcome to Tax Genius Pro'}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            {taxReturn
              ? `Your ${taxReturn.taxYear} tax return is in progress`
              : 'Start your tax filing journey today'}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Refund/Amount Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {taxReturn?.refundAmount ? 'Estimated Refund' : 'Tax Status'}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {taxReturn?.refundAmount
                  ? `$${Number(taxReturn.refundAmount).toLocaleString()}`
                  : taxReturn?.oweAmount
                    ? `$${Number(taxReturn.oweAmount).toLocaleString()}`
                    : 'Not Filed'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {taxReturn?.refundAmount
                  ? 'Expected refund'
                  : taxReturn?.oweAmount
                    ? 'Amount owed'
                    : 'Start your filing'}
              </p>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.documentsCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.documentsCount ? 'Uploaded documents' : 'No documents yet'}
              </p>
            </CardContent>
          </Card>

          {/* Deadline Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Filing Deadline</CardTitle>
              <CalendarIcon className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.daysUntilDeadline > 0 ? `${stats.daysUntilDeadline} days` : 'Past Due'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.daysUntilDeadline > 0 ? 'Until April 15th' : 'File extension needed'}
              </p>
            </CardContent>
          </Card>

          {/* Referrals Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">My Referrals</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{referralStats?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {referralStats?.totalLeads ? 'People referred' : 'Start earning'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tax Return Progress */}
        {taxReturn ? (
          <Card>
            <CardHeader>
              <CardTitle>Tax Return Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {taxReturn.status.replace('_', ' ')} - {taxReturn.progress}% Complete
                  </span>
                  <span className="text-muted-foreground">Tax Year {taxReturn.taxYear}</span>
                </div>
                <Progress value={taxReturn.progress || 0} className="h-2" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  {taxReturn.status === 'DRAFT' ? (
                    <Clock className="h-4 w-4 text-blue-500" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">Documents</span>
                </div>
                <div className="flex items-center gap-2">
                  {['IN_REVIEW', 'FILED', 'ACCEPTED'].includes(taxReturn.status) ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Review</span>
                </div>
                <div className="flex items-center gap-2">
                  {taxReturn.status === 'ACCEPTED' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Filed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertTitle>Get Started with Your Tax Return</AlertTitle>
            <AlertDescription>
              You haven't started your tax filing yet. Use the sidebar to navigate and begin your
              tax filing process, or start earning by referring friends and family.
            </AlertDescription>
          </Alert>
        )}

        {/* Recent Activity */}
        {data?.recentActivity && data.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.slice(0, 5).map((activity: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      {activity.type === 'document' ? (
                        <FileText className="h-4 w-4 text-primary" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Referral Links Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Share & Earn</h2>
            <p className="text-sm text-muted-foreground">
              Refer friends and family to earn rewards
            </p>
          </div>
          <ReferralLinksManager />
        </div>
      </div>
      </div>
    </>
  );
}
