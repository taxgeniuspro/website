import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Calendar,
  Users,
  PhoneCall,
} from 'lucide-react';
import Link from 'next/link';
import {
  getTodaysDashboardData,
  getPreparerMissedFollowUps,
  getPreparerTopReferrers,
  getConversionFunnel,
  getClientSources,
  getEarningsBreakdown,
  getHotLeads,
  getRecentActivity,
  getTopLinksToday,
  getPreparerDashboardStats,
} from '@/lib/services/preparer-analytics.service';
import { TodayScheduleCard } from '@/components/dashboard/preparer/TodayScheduleCard';
import { MetricsRow } from '@/components/dashboard/preparer/MetricsRow';
import { ConversionFunnelChart } from '@/components/dashboard/preparer/ConversionFunnelChart';
import { ClientSourcesDonut } from '@/components/dashboard/preparer/ClientSourcesDonut';
import { EarningsDonut } from '@/components/dashboard/preparer/EarningsDonut';
import { TopLinksCard } from '@/components/dashboard/preparer/TopLinksCard';
import { ResponseTimeGauge } from '@/components/dashboard/preparer/ResponseTimeGauge';
import { RecentActivityFeed } from '@/components/dashboard/preparer/RecentActivityFeed';
import { HotLeadsAlert } from '@/components/dashboard/preparer/HotLeadsAlert';

export const metadata = {
  title: 'Dashboard - Tax Genius Pro',
  description: 'Your tax preparer dashboard overview',
};

async function isTaxPreparer() {
  const session = await auth();
  const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'tax_preparer' ;
}

export default async function PreparerDashboard() {
  const userIsPreparer = await isTaxPreparer();

  if (!userIsPreparer) {
    redirect('/forbidden');
  }

  const session = await auth();
  const user = session?.user;
  const preparerId = user?.id || '';
  const firstName = user?.name?.split(' ')[0] || 'Preparer';

  // Fetch all dashboard data in parallel
  const [
    todayData,
    missedFollowUps,
    topReferrers,
    funnelData,
    clientSources,
    earningsBreakdown,
    hotLeads,
    recentActivity,
    topLinks,
    stats,
  ] = await Promise.all([
    getTodaysDashboardData(preparerId),
    getPreparerMissedFollowUps(preparerId),
    getPreparerTopReferrers(preparerId, 5),
    getConversionFunnel(preparerId, 'today'),
    getClientSources(preparerId, 'month'),
    getEarningsBreakdown(preparerId, 'month'),
    getHotLeads(preparerId, 5),
    getRecentActivity(preparerId, 10),
    getTopLinksToday(preparerId, 5),
    getPreparerDashboardStats(preparerId),
  ]);

  // Add urgency to missed follow-ups
  const missedFollowUpsWithUrgency = missedFollowUps.map(followUp => ({
    ...followUp,
    urgency: followUp.daysWaiting >= 7 ? 'critical' as const
      : followUp.daysWaiting >= 3 ? 'high' as const
      : followUp.daysWaiting >= 1 ? 'medium' as const
      : 'low' as const,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening today
          </p>
        </div>

        {/* Section 1: Today's Schedule */}
        <TodayScheduleCard data={todayData.appointments} />

        {/* Section 2: Action Alerts */}
        {/* Hot Leads Alert */}
        <HotLeadsAlert data={hotLeads} />

        {/* Missed Follow-Ups Alert */}
        {missedFollowUpsWithUrgency.length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                ACTION REQUIRED: {missedFollowUpsWithUrgency.length} Missed Follow-Ups
              </CardTitle>
              <CardDescription>
                Clients waiting for your response - sorted by urgency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {missedFollowUpsWithUrgency.slice(0, 5).map((followUp) => (
                  <div
                    key={followUp.id}
                    className={`border rounded-lg p-4 ${
                      followUp.urgency === 'critical'
                        ? 'border-red-300 bg-red-100 dark:bg-red-900/20'
                        : followUp.urgency === 'high'
                          ? 'border-orange-300 bg-orange-100 dark:bg-orange-900/20'
                          : 'border-yellow-300 bg-yellow-100 dark:bg-yellow-900/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge
                            variant={
                              followUp.urgency === 'critical'
                                ? 'destructive'
                                : followUp.urgency === 'high'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {followUp.daysWaiting} days waiting
                          </Badge>
                          <Badge variant="outline">{followUp.source}</Badge>
                        </div>
                        <p className="font-semibold">{followUp.clientName}</p>
                        <p className="text-sm text-muted-foreground">{followUp.clientEmail}</p>
                        <p className="text-sm text-muted-foreground">{followUp.clientPhone}</p>
                        <p className="text-sm mt-1">
                          <strong>Requested:</strong> {followUp.contactMethod}
                        </p>
                      </div>
                      <div className="flex flex-row sm:flex-col gap-2">
                        <Button size="sm" variant="default" className="flex-1 sm:flex-none">
                          <PhoneCall className="h-3 w-3 mr-1" />
                          Contact
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none">
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {missedFollowUpsWithUrgency.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground">
                    + {missedFollowUpsWithUrgency.length - 5} more waiting for follow-up
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 3: Key Metrics Row */}
        <MetricsRow
          linkClicks={todayData.linkClicks}
          intakeForms={todayData.intakeForms}
          appointmentsBooked={todayData.appointmentsBooked}
          earnings={todayData.earnings}
        />

        {/* Section 4: Conversion Funnel */}
        <ConversionFunnelChart data={funnelData} period="today" />

        {/* Section 5: Two-Column Charts */}
        <div className="grid gap-4 md:grid-cols-2">
          <ClientSourcesDonut data={clientSources} />
          <EarningsDonut data={earningsBreakdown} />
        </div>

        {/* Section 6: Top Links + Top Referrers */}
        <div className="grid gap-4 md:grid-cols-2">
          <TopLinksCard data={topLinks} />
          {/* Top Referrers Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5" />
                Top Referrers
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/tax-preparer/analytics">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">No referrers yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topReferrers.map((referrer, index) => (
                    <div
                      key={referrer.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{referrer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {referrer.conversionRate}% conversion
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{referrer.referralCount} refs</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 7: Response Time + Recent Activity */}
        <div className="grid gap-4 md:grid-cols-2">
          <ResponseTimeGauge averageHours={stats.averageResponseTime} targetHours={4} />
          <RecentActivityFeed data={recentActivity} />
        </div>
      </div>
    </div>
  );
}
