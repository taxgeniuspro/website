import { redirect } from 'next/navigation';
import { isAdmin, getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// TypeScript interfaces for Supabase data
interface AffiliateProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: string;
  affiliateStatus: string | null;
  totalConversions: number | null;
  lifetimeEarnings: number | null;
  currentTier: string | null;
  createdAt: string;
  user: { email: string } | null;
  affiliateGroup: { name: string } | null;
}
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminAffiliatesPage() {
  const userIsAdmin = await isAdmin();
  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  const user = await getAuthenticatedUser();

  // Fetch affiliate statistics
  // Note: 'affiliate' role was removed - affiliates are now users with affiliateStatus='APPROVED'
  // We query for tax_preparers (who auto-have affiliate features) OR any user with affiliateStatus

  // Count all users who are either tax_preparers or have affiliate status set
  const { count: totalAffiliates } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('role.eq.tax_preparer,affiliateStatus.in.(APPROVED,PENDING)');

  const { count: pendingAffiliates } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('affiliateStatus', 'PENDING');

  const { count: approvedAffiliates } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('affiliateStatus', 'APPROVED');

  const { count: totalGroups } = await db
    .from('affiliate_groups')
    .select('*', { count: 'exact', head: true });

  const { count: totalCreatives } = await db
    .from('affiliate_creatives')
    .select('*', { count: 'exact', head: true });

  // Get recent affiliates with user and affiliateGroup data
  const { data: recentAffiliatesData } = await db
    .from('profiles')
    .select(`
      id,
      firstName,
      lastName,
      avatarUrl,
      role,
      affiliateStatus,
      totalConversions,
      lifetimeEarnings,
      currentTier,
      createdAt,
      users!profiles_userId_fkey(email),
      affiliate_groups!profiles_affiliateGroupId_fkey(name)
    `)
    .or('role.eq.tax_preparer,affiliateStatus.in.(APPROVED,PENDING)')
    .order('createdAt', { ascending: false })
    .limit(10);

  // Transform data to match expected structure
  const recentAffiliates: AffiliateProfile[] = (recentAffiliatesData || []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    firstName: item.firstName as string | null,
    lastName: item.lastName as string | null,
    avatarUrl: item.avatarUrl as string | null,
    role: item.role as string,
    affiliateStatus: item.affiliateStatus as string | null,
    totalConversions: item.totalConversions as number | null,
    lifetimeEarnings: item.lifetimeEarnings as number | null,
    currentTier: item.currentTier as string | null,
    createdAt: item.createdAt as string,
    user: item.users ? { email: (item.users as { email: string }).email } : null,
    affiliateGroup: item.affiliate_groups ? { name: (item.affiliate_groups as { name: string }).name } : null,
  }));

  // Calculate aggregate stats
  const { data: statsData } = await db
    .from('profiles')
    .select('totalConversions, lifetimeEarnings')
    .or('role.eq.tax_preparer,affiliateStatus.in.(APPROVED,PENDING)');

  const affiliateStats = {
    _sum: {
      totalConversions: (statsData || []).reduce((sum: number, p: { totalConversions: number | null }) => sum + (p.totalConversions || 0), 0),
      lifetimeEarnings: (statsData || []).reduce((sum: number, p: { lifetimeEarnings: number | null }) => sum + (p.lifetimeEarnings || 0), 0),
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Affiliate Management</h1>
            <p className="text-muted-foreground">
              Manage affiliates, groups, and marketing materials
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/affiliates/groups">
                <Layers className="w-4 h-4 mr-2" />
                Manage Groups
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/admin/affiliates/creatives">
                <ImageIcon className="w-4 h-4 mr-2" />
                Marketing Materials
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAffiliates}</div>
              <p className="text-xs text-muted-foreground">All registered affiliates</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingAffiliates}</div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Affiliates</CardTitle>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedAffiliates}</div>
              <p className="text-xs text-muted-foreground">Approved & active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {affiliateStats._sum.totalConversions?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Lifetime referrals</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${affiliateStats._sum.lifetimeEarnings ? Number(affiliateStats._sum.lifetimeEarnings).toLocaleString() : 0}
              </div>
              <p className="text-xs text-muted-foreground">All-time payouts</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer" asChild>
            <Link href="/dashboard/admin/affiliates/groups">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                  Affiliate Groups
                </CardTitle>
                <CardDescription>
                  {totalGroups} groups configured with tiered commissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Manage Groups
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer" asChild>
            <Link href="/dashboard/admin/affiliates/creatives">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  Marketing Materials
                </CardTitle>
                <CardDescription>
                  {totalCreatives} creatives available for affiliates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  Manage Creatives
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Payout Requests
              </CardTitle>
              <CardDescription>Review and process affiliate payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/payouts">View Payouts</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Affiliates */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Affiliates</CardTitle>
            <CardDescription>Latest affiliate signups and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAffiliates.map((affiliate) => (
                <div
                  key={affiliate.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                      {affiliate.avatarUrl ? (
                        <img
                          src={affiliate.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {affiliate.firstName} {affiliate.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{affiliate.user?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {affiliate.role}
                        </Badge>
                        {affiliate.affiliateGroup && (
                          <Badge variant="secondary" className="text-xs">
                            {affiliate.affiliateGroup.name}
                          </Badge>
                        )}
                        {affiliate.currentTier && (
                          <Badge variant="outline" className="text-xs">
                            {affiliate.currentTier}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {affiliate.totalConversions} conversions
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${affiliate.lifetimeEarnings ? Number(affiliate.lifetimeEarnings).toFixed(2) : '0.00'} earned
                      </p>
                    </div>
                    <Badge
                      variant={
                        affiliate.affiliateStatus === 'APPROVED'
                          ? 'default'
                          : affiliate.affiliateStatus === 'PENDING'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {affiliate.affiliateStatus}
                    </Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {recentAffiliates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No affiliates found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
