import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  FileText,
  Link as LinkIcon,
  QrCode,
  Share2,
  Trophy,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Client Referrals - Tax Genius Pro',
  description: 'Manage your client referrals and track earnings',
};

async function isTaxPreparer() {
  const session = await auth();
  const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'TAX_PREPARER' || role === 'super_admin';
}

export default async function PreparerReferralsPage() {
  const userIsPreparer = await isTaxPreparer();

  if (!userIsPreparer) {
    redirect('/forbidden');
  }

  const session = await auth();
  const preparerId = session?.user?.id;

  if (!preparerId) {
    redirect('/login');
  }

  // Get preparer's profile
  const profile = await prisma.profile.findUnique({
    where: { userId: preparerId },
  });

  if (!profile) {
    redirect('/login');
  }

  // Get referral statistics
  const [
    totalReferrals,
    convertedReferrals,
    pendingReferrals,
    recentReferrals,
    bondedAffiliates,
    totalCommissions,
  ] = await Promise.all([
    // Total referrals (clients who came through preparer's links)
    prisma.taxIntakeLead.count({
      where: { taxPreparerId: profile.id },
    }),
    // Converted referrals
    prisma.taxIntakeLead.count({
      where: {
        taxPreparerId: profile.id,
        status: { in: ['CONVERTED', 'FILED'] },
      },
    }),
    // Pending referrals
    prisma.taxIntakeLead.count({
      where: {
        taxPreparerId: profile.id,
        status: { in: ['NEW', 'IN_PROGRESS', 'PENDING'] },
      },
    }),
    // Recent referrals
    prisma.taxIntakeLead.findMany({
      where: { taxPreparerId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        referrerCode: true,
        intakeType: true,
      },
    }),
    // Bonded affiliates
    prisma.affiliateBonding.count({
      where: { preparerId: profile.id },
    }),
    // Total commissions from referrals
    prisma.commission.aggregate({
      where: {
        profileId: profile.id,
        status: 'PAID',
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const conversionRate = totalReferrals > 0
    ? Math.round((convertedReferrals / totalReferrals) * 100)
    : 0;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONVERTED':
      case 'FILED':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'NEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Client Referrals</h1>
            <p className="text-muted-foreground">
              Track referrals from your marketing links and bonded affiliates
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/tax-preparer/tracking">
                <QrCode className="w-4 h-4 mr-2" />
                My Links
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/tax-preparer/bonded-affiliates">
                <Users className="w-4 h-4 mr-2" />
                Bonded Affiliates
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferrals}</div>
              <p className="text-xs text-muted-foreground">All-time clients referred</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <FileText className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{convertedReferrals}</div>
              <p className="text-xs text-muted-foreground">Returns filed</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Calendar className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingReferrals}</div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
              <p className="text-xs text-muted-foreground">Referrals converted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalCommissions._sum.amount?.toNumber().toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">From referrals</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                Share Your Link
              </CardTitle>
              <CardDescription>
                Share your personal referral link with clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <Link href="/dashboard/tax-preparer/tracking">
                  <Share2 className="w-4 h-4 mr-2" />
                  View & Share Links
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Bonded Affiliates
              </CardTitle>
              <CardDescription>
                {bondedAffiliates} affiliate{bondedAffiliates !== 1 ? 's' : ''} bonded to you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/dashboard/tax-preparer/bonded-affiliates">
                  View Affiliates
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                See how you rank among other preparers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" asChild>
                <Link href="/dashboard/tax-preparer/analytics">
                  View Analytics
                  <ArrowUpRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Referrals */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
            <CardDescription>Your latest client referrals</CardDescription>
          </CardHeader>
          <CardContent>
            {recentReferrals.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet</p>
                <p className="text-sm mt-2">
                  Share your referral link to start getting clients
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/dashboard/tax-preparer/tracking">
                    Get Your Referral Link
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {referral.firstName} {referral.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{referral.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {referral.intakeType || 'Direct'}
                          </Badge>
                          {referral.referrerCode && (
                            <Badge variant="outline" className="text-xs">
                              via {referral.referrerCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={`${getStatusColor(referral.status)} border`}>
                          {referral.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(referral.createdAt)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/tax-preparer/leads?id=${referral.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
