import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { logger } from '@/lib/logger';
import { QrCode, Users, Search, ExternalLink, Copy, Filter } from 'lucide-react';

export const metadata = {
  title: 'Tracking Codes Management | Tax Genius Pro',
  description: 'View and manage all user tracking codes',
};

async function checkAdminAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false };

  const role = user?.role as string;
  const hasAccess = role === 'admin' || role === 'super_admin';

  return { hasAccess, userId: user.id };
}

async function getAllTrackingCodes() {
  // Fetch all tracking codes with user details
  const profiles = await prisma.profile.findMany({
    where: {
      OR: [{ trackingCode: { not: null } }, { customTrackingCode: { not: null } }],
    },
    select: {
      id: true,
      userId: true,
      role: true,
      trackingCode: true,
      customTrackingCode: true,
      trackingCodeChanged: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get Clerk user details for each profile
  const trackingCodes = await Promise.all(
    profiles.map(async (profile) => {
      let userName = 'Unknown User';
      let userEmail = 'unknown@example.com';

      if (profile.userId) {
        try {
          // In a real implementation, you'd fetch from Clerk API
          // For now, we'll use placeholder data
          userName = `User ${profile.userId.substring(0, 8)}`;
          userEmail = `user${profile.userId.substring(0, 8)}@example.com`;
        } catch (error) {
          logger.error('Error fetching user details:', error);
        }
      }

      return {
        profileId: profile.id,
        userId: profile.userId,
        userName,
        userEmail,
        role: profile.role,
        trackingCode: profile.trackingCode,
        customTrackingCode: profile.customTrackingCode,
        activeCode: profile.customTrackingCode || profile.trackingCode,
        isCustomized: profile.trackingCodeChanged,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      };
    })
  );

  return trackingCodes;
}

export default async function AdminTrackingCodesPage() {
  const { hasAccess } = await checkAdminAccess();

  if (!hasAccess) {
    redirect('/forbidden');
  }

  const trackingCodes = await getAllTrackingCodes();

  // Calculate statistics
  const totalCodes = trackingCodes.length;
  const customizedCodes = trackingCodes.filter((tc) => tc.isCustomized).length;
  const autoCodes = totalCodes - customizedCodes;

  const roleBreakdown = trackingCodes.reduce(
    (acc, tc) => {
      acc[tc.role] = (acc[tc.role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tracking Codes Management</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all user tracking codes across the platform
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCodes}</div>
            <p className="text-xs text-muted-foreground mt-1">Active tracking codes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Customized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{customizedCodes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalCodes > 0 ? ((customizedCodes / totalCodes) * 100).toFixed(1) : 0}%
              customization rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Auto-Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{autoCodes}</div>
            <p className="text-xs text-muted-foreground mt-1">Default codes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">By Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(roleBreakdown).map(([role, count]) => (
                <div key={role} className="flex items-center justify-between text-xs">
                  <span className="capitalize">{role.replace('_', ' ')}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tracking Codes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Tracking Codes</CardTitle>
              <CardDescription>View tracking codes for all users in the system</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-8 w-[250px]" disabled />
              </div>
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
                disabled
              >
                <Filter className="h-4 w-4" />
                Filter
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trackingCodes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <QrCode className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No tracking codes found</p>
              </div>
            ) : (
              trackingCodes.map((tc) => (
                <div
                  key={tc.profileId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{tc.userName}</p>
                        <Badge variant="outline" className="capitalize text-xs">
                          {tc.role.replace('_', ' ')}
                        </Badge>
                        {tc.isCustomized && (
                          <Badge variant="secondary" className="text-xs">
                            Custom
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{tc.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <code className="text-sm font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded">
                        {tc.activeCode}
                      </code>
                      {tc.customTrackingCode && tc.trackingCode && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: <code className="text-xs">{tc.trackingCode}</code>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-1">
                      <button
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                        title="Copy tracking code"
                        onClick={() => navigator.clipboard.writeText(tc.activeCode || '')}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a
                        href={`https://taxgeniuspro.tax?ref=${tc.activeCode}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-accent rounded-md transition-colors"
                        title="View tracking URL"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon - Performance Analytics */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-muted-foreground">
            Performance Analytics (Coming Soon)
          </CardTitle>
          <CardDescription>
            Track aggregate performance metrics across all tracking codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-50">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground mt-1">Total Clicks</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground mt-1">Total Leads</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground mt-1">Total Conversions</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-2xl font-bold">-</p>
              <p className="text-xs text-muted-foreground mt-1">Total Revenue</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
