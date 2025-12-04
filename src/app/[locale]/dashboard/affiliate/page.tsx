'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  DollarSign,
  TrendingUp,
  Trophy,
  FileText,
  Share2,
  QrCode,
  Bell,
  BarChart3,
  Calendar,
  Wallet,
  Store,
  ShoppingCart,
  Package,
  Sparkles,
  CheckCircle,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { ContestDisplay } from '@/components/ContestDisplay';
import { VanityLinkManager } from '@/components/VanityLinkManager';
import { QRPosterGenerator } from '@/components/QRPosterGenerator';
import { MarketingHub } from '@/components/MarketingHub';
import { NotificationBell } from '@/components/NotificationBell';
import { StatCard } from '@/components/StatCard';
import { useReferrerStats, useRecentActivity } from '@/hooks/useReferrerData';
import { MaterialsTable } from '@/components/analytics/MaterialsTable';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { SourceBreakdown } from '@/components/analytics/SourceBreakdown';
import { AttributionStatsCard } from '@/components/dashboard/attribution-stats-card';
import { RecentLeadsTable } from '@/components/dashboard/recent-leads-table';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { StatsWidget } from '@/components/gamification/StatsWidget';
import { useSession } from 'next-auth/react';
import { OnboardingDialog } from '@/components/OnboardingDialog';
import { UserRole } from '@/lib/permissions';

export default function AffiliateDashboard() {
  const { data: session } = useSession(); const user = session?.user;
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState('overview');
  const { data: stats, isLoading: statsLoading } = useReferrerStats();
  const { data: activity, isLoading: activityLoading } = useRecentActivity(5);

  // Affiliate ID comes from auth context
  const affiliateId = user?.id || 'current-affiliate-id';
  const affiliateName = 'Affiliate'; // Will be replaced with real name from auth

  return (
    <>
      {/* Onboarding Dialog */}
      {user && (
        <OnboardingDialog
          role={(user?.role as UserRole) || 'affiliate'}
          userName={user.name || undefined}
        />
      )}

      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
          {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Affiliate Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track your campaigns, earnings, and marketing performance
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell userId={affiliateId} />
            <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Gamification Widget */}
        {user && <StatsWidget userId={user.id} role="affiliate" compact={true} />}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatCard
                title="Total Referrals"
                value={stats?.total_referrals || 0}
                icon={<Users className="h-4 w-4" />}
                description="+12% from last month"
                trend="up"
              />
              <StatCard
                title="Completed Returns"
                value={stats?.completed_returns || 0}
                icon={<FileText className="h-4 w-4" />}
                description="Tax returns filed"
              />
              <StatCard
                title="Total Earnings"
                value={`$${stats?.total_earnings || 0}`}
                icon={<DollarSign className="h-4 w-4" />}
                description={`$${stats?.earnings_this_month || 0} this month`}
                trend="up"
                onClick={() => router.push('/dashboard/affiliate/earnings')}
                className="cursor-pointer hover:shadow-md transition-shadow"
              />
              <StatCard
                title="Contest Rank"
                value={stats?.contest_rank ? `#${stats.contest_rank}` : 'N/A'}
                icon={<Trophy className="h-4 w-4" />}
                description="Current leaderboard position"
                trend={stats?.contest_rank && stats.contest_rank <= 10 ? 'up' : undefined}
              />
            </>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="links" className="text-xs sm:text-sm">Links & QR</TabsTrigger>
            <TabsTrigger value="store" className="text-xs sm:text-sm">Store</TabsTrigger>
            <TabsTrigger value="contests" className="text-xs sm:text-sm">Contests</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs sm:text-sm">Marketing</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest referral activities</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activity?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{item.client_name}</p>
                            <p className="text-xs text-muted-foreground">{item.action}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-primary">+${item.amount}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {(!activity || activity.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No recent activity
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and tools</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => router.push('/dashboard/affiliate/earnings')}
                  >
                    <Wallet className="mr-2 h-4 w-4" />
                    View Earnings & Request Payout
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setSelectedTab('links')}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Referral Link
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setSelectedTab('links')}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Generate QR Poster
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setSelectedTab('analytics')}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Full Analytics
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>
                  Your performance metrics for{' '}
                  {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">New Referrals</p>
                    <p className="text-2xl font-bold">{stats?.referrals_this_month || 0}</p>
                    <Badge variant="secondary">Target: 20</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Monthly Earnings</p>
                    <p className="text-2xl font-bold">${stats?.earnings_this_month || 0}</p>
                    <Badge variant="secondary">Target: $2,000</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold">
                      {stats?.total_referrals && stats?.completed_returns
                        ? `${Math.round((stats.completed_returns / stats.total_referrals) * 100)}%`
                        : '0%'}
                    </p>
                    <Badge variant="secondary">Target: 75%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EPIC 6: Attribution Analytics */}
            <AttributionStatsCard period="30d" />

            {/* EPIC 6: Recent Leads with Attribution */}
            <RecentLeadsTable limit={10} />

            {/* Top 5 Campaigns Preview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top 5 Performing Campaigns</CardTitle>
                    <CardDescription>Your best marketing campaigns this month</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedTab('analytics')}>
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <MaterialsTable limit={5} dateRange="month" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <ReferralLinksManager />
            <VanityLinkManager referrerId={affiliateId} />
            <QRPosterGenerator
              referralUrl={`https://taxgenius.com/${affiliateName.toLowerCase().replace(/\s+/g, '')}`}
              referrerName={affiliateName}
            />
          </TabsContent>
          <TabsContent value="store" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Store Access Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Marketing Store
                  </CardTitle>
                  <CardDescription>
                    Purchase marketing materials and subscriptions to grow your affiliate business
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      As an affiliate, you get access to:
                    </p>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Generic Tax Genius branded materials with tracking
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Trackable QR codes and referral links
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Landing page subscriptions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Digital assets for social media
                      </li>
                    </ul>
                  </div>
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/store">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Browse Store
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Active Subscriptions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Your Subscriptions
                  </CardTitle>
                  <CardDescription>Active marketing products</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm mb-2">No active subscriptions yet</p>
                      <p className="text-xs mb-4">
                        Start with a landing page to generate more leads
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/store?category=landing-pages">
                          <Sparkles className="mr-2 h-4 w-4" />
                          View Landing Pages
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Product Categories */}
            <Card>
              <CardHeader>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Quick access to marketing products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <Button variant="outline" className="h-auto flex-col py-6" asChild>
                    <Link href="/store?category=landing-pages">
                      <Sparkles className="h-8 w-8 mb-2" />
                      <span className="font-semibold">Landing Pages</span>
                      <span className="text-xs text-muted-foreground mt-1">From $29/mo</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-6" asChild>
                    <Link href="/store?category=marketing-materials">
                      <Package className="h-8 w-8 mb-2" />
                      <span className="font-semibold">Marketing Materials</span>
                      <span className="text-xs text-muted-foreground mt-1">Print & Digital</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-6" asChild>
                    <Link href="/store?category=qr-codes">
                      <QrCode className="h-8 w-8 mb-2" />
                      <span className="font-semibold">QR Codes</span>
                      <span className="text-xs text-muted-foreground mt-1">Trackable</span>
                    </Link>
                  </Button>
                  <Button variant="outline" className="h-auto flex-col py-6" asChild>
                    <Link href="/store?category=digital-assets">
                      <FileText className="h-8 w-8 mb-2" />
                      <span className="font-semibold">Digital Assets</span>
                      <span className="text-xs text-muted-foreground mt-1">Social Media</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Special Offers */}
            <Card className="bg-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Affiliate Special Offers
                </CardTitle>
                <CardDescription>Exclusive discounts for affiliate marketers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="border border-primary/20 bg-background rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default">Limited Time</Badge>
                      <p className="text-sm font-bold text-primary">Save 25%</p>
                    </div>
                    <h4 className="font-semibold mb-1">Annual Landing Page Bundle</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Get a full year of landing page hosting for just $29/month (normally
                      $39/month)
                    </p>
                    <Button size="sm" className="w-full" asChild>
                      <Link href="/store?offer=annual-bundle">Claim Offer</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contests" className="space-y-4">
            <ContestDisplay referrerId={affiliateId} currentUserId={affiliateId} />
          </TabsContent>

          <TabsContent value="marketing" className="space-y-4">
            <MarketingHub />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Top 15 Campaigns Table */}
            <Card>
              <CardContent className="pt-6">
                <MaterialsTable limit={15} dateRange="all" />
              </CardContent>
            </Card>

            {/* Campaign Performance & Earnings */}
            <div className="grid gap-4 md:grid-cols-2">
              <ConversionFunnel dateRange="month" />
              <SourceBreakdown dateRange="month" />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
  );
}
