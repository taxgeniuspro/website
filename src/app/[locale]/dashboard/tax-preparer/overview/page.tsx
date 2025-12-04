import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Calendar,
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Link as LinkIcon,
  PhoneCall,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import {
  getPreparerDashboardStats,
  getPreparerMissedFollowUps,
  getPreparerTopReferrers,
  getPreparerTopLinks,
} from '@/lib/services/preparer-analytics.service';

export const metadata = {
  title: 'Preparer Dashboard - Tax Genius Pro',
  description: 'Your tax preparer operational dashboard',
};

async function isTaxPreparer() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'TAX_PREPARER' || role === 'super_admin';
}

export default async function PreparerOverviewDashboard() {
  const userIsPrepar = await isTaxPreparer();

  if (!userIsPrepar) {
    redirect('/forbidden');
  }

  const session = await auth(); const user = session?.user;
  const preparerId = user?.id || '';

  // Fetch all dashboard data
  const stats = await getPreparerDashboardStats(preparerId);
  const missedFollowUps = await getPreparerMissedFollowUps(preparerId);
  const topReferrers = await getPreparerTopReferrers(preparerId, 10);
  const topLinks = await getPreparerTopLinks(preparerId, 10);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preparer Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName || 'Preparer'}</p>
        </div>

        {/* CRITICAL ALERTS - Missed Follow-Ups */}
        {missedFollowUps.length > 0 && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                ACTION REQUIRED: {missedFollowUps.length} Missed Follow-Ups
              </CardTitle>
              <CardDescription>
                Clients waiting for your response - sorted by urgency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {missedFollowUps.slice(0, 5).map((followUp) => (
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
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
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="default">
                          <PhoneCall className="h-3 w-3 mr-1" />
                          Contact Now
                        </Button>
                        <Button size="sm" variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {missedFollowUps.length > 5 && (
                  <p className="text-sm text-center text-muted-foreground">
                    + {missedFollowUps.length - 5} more waiting for follow-up
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Intake Forms</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalIntakesForms}</div>
              <p className="text-xs text-muted-foreground">Total submissions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Referrals Received</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">Clients referred to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Returns Filed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.returnsCompleted}</div>
              <p className="text-xs text-muted-foreground">{stats.returnsInProgress} in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Earnings (Month)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.earningsThisMonth.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                ${stats.totalEarnings.toLocaleString()} total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Top 10 Referrers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top 10 Referrers
              </CardTitle>
              <CardDescription>People who sent you the most clients</CardDescription>
            </CardHeader>
            <CardContent>
              {topReferrers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No referrals yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topReferrers.map((referrer, index) => (
                    <div
                      key={referrer.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{referrer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {referrer.conversionRate}% conversion rate
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{referrer.referralCount} referrals</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Marketing Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Top 10 Performing Links
              </CardTitle>
              <CardDescription>Your best marketing links by conversions</CardDescription>
            </CardHeader>
            <CardContent>
              {topLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No marketing links yet</p>
                  <Button variant="link" size="sm" className="mt-2" asChild>
                    <Link href="/store">Create your first link</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {topLinks.map((link, index) => (
                    <div
                      key={link.linkId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{link.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {link.clicks} clicks → {link.conversions} conversions
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{link.conversionRate}% CVR</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Your Performance</CardTitle>
            <CardDescription>Key metrics for your practice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Avg Response Time</p>
                </div>
                <p className="text-3xl font-bold">
                  {stats.averageResponseTime}
                  <span className="text-base font-normal text-muted-foreground ml-1">hours</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.averageResponseTime <= 24 ? 'Great!' : 'Try to respond faster'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Missed Follow-Ups</p>
                </div>
                <p className="text-3xl font-bold">
                  {stats.missedFollowUpsCount}
                  <span className="text-base font-normal text-muted-foreground ml-1">pending</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.missedFollowUpsCount === 0 ? 'All caught up!' : 'Action required'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Conversion Rate</p>
                </div>
                <p className="text-3xl font-bold">
                  {stats.returnsCompleted > 0 && stats.totalIntakesForms > 0
                    ? Math.round((stats.returnsCompleted / stats.totalIntakesForms) * 100)
                    : 0}
                  <span className="text-base font-normal text-muted-foreground ml-1">%</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Intakes → Filed returns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/tax-preparer/clients">
                <Users className="mr-2 h-4 w-4" />
                View All Clients
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/tax-preparer/documents">
                <FileText className="mr-2 h-4 w-4" />
                Review Documents
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/tax-preparer/earnings">
                <DollarSign className="mr-2 h-4 w-4" />
                View Earnings
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/store">
                <LinkIcon className="mr-2 h-4 w-4" />
                Marketing Tools
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
