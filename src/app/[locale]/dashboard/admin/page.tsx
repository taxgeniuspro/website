import { redirect } from 'next/navigation';
import { isAdmin, getAuthenticatedUser } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  Activity,
  ArrowUp,
  ArrowDown,
  BarChart3,
  MousePointerClick,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Trophy,
  Link as LinkIcon,
  PhoneCall,
} from 'lucide-react';
import Link from 'next/link';
import {
  getDashboardStats,
  getRecentActivity,
  getRevenueChart,
  getPagePerformance,
  getAIContentMetrics,
  getTrafficSources,
  getPendingActionsCount,
} from '@/lib/services/analytics.service';
import {
  getAllMissedFollowUps,
  getPlatformAccountabilityStats,
} from '@/lib/services/accountability.service';
import { getTopPreparers } from '@/lib/services/preparer-analytics.service';
import { getTopPerformingLinks } from '@/lib/services/link-tracking.service';

export default async function AdminDashboardPage() {
  // Check if user is admin
  const userIsAdmin = await isAdmin();

  // Redirect non-admin users to forbidden page
  if (!userIsAdmin) {
    redirect('/forbidden');
  }

  const user = await getAuthenticatedUser();

  // Fetch real dashboard statistics
  const stats = await getDashboardStats();
  const recentActivity = await getRecentActivity();

  // Fetch analytics data
  const revenueChart = await getRevenueChart();
  const pagePerformance = await getPagePerformance();
  const aiContentMetrics = await getAIContentMetrics();
  const trafficSources = await getTrafficSources();
  const pendingActions = await getPendingActionsCount();

  // Fetch accountability & leaderboard data
  const missedFollowUps = await getAllMissedFollowUps(10); // Top 10 most urgent
  const accountabilityStats = await getPlatformAccountabilityStats();
  const topPreparers = await getTopPreparers('clients', 10);
  const topLinks = await getTopPerformingLinks(10);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName || 'Admin'}</p>
        </div>

        {/* Client Stats Grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="bg-blue-50 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Old Clients</CardTitle>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.oldClients || 15}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">Returning customers</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Clients</CardTitle>
              <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.newClients || 15}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400">First year clients</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Referrals</CardTitle>
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {stats.referrals || 10}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400">Pending intake</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Leads</CardTitle>
              <Activity className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                {stats.todaysLeads || 2}
              </div>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">New today</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Week's Leads</CardTitle>
              <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                {stats.weeksLeads || 10}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
              <p
                className={`text-xs flex items-center gap-1 ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {stats.revenueGrowth >= 0 ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                {Math.abs(stats.revenueGrowth)}% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Alerts */}
        {(pendingActions.pendingPayouts > 0 ||
          pendingActions.newLeads > 0 ||
          pendingActions.failedPayments > 0) && (
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {pendingActions.pendingPayouts > 0 && (
              <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
                  <Clock className="w-4 h-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {pendingActions.pendingPayouts}
                  </div>
                  <Button variant="link" className="px-0 h-auto text-xs mt-2" asChild>
                    <Link href="/admin/payouts">Review Payouts →</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {pendingActions.newLeads > 0 && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">New Leads (24h)</CardTitle>
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{pendingActions.newLeads}</div>
                  <Button variant="link" className="px-0 h-auto text-xs mt-2" asChild>
                    <Link href="/admin/users">View Leads →</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {pendingActions.failedPayments > 0 && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Failed Payments (7d)</CardTitle>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {pendingActions.failedPayments}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${pendingActions.failedPaymentsAmount.toFixed(2)} total
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* CRITICAL ACCOUNTABILITY SECTION - Platform-Wide Missed Follow-Ups */}
        {missedFollowUps.length > 0 && (
          <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
                CRITICAL: {accountabilityStats.totalMissedFollowUps} Missed Follow-Ups Platform-Wide
                {accountabilityStats.criticalAlerts > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {accountabilityStats.criticalAlerts} Critical (48+ hours)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Clients waiting for preparer contact - sorted by urgency (oldest first)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {missedFollowUps.map((followUp) => (
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
                          <Badge variant="outline">{followUp.contactMethod}</Badge>
                        </div>
                        <p className="font-semibold">{followUp.clientName}</p>
                        <p className="text-sm text-muted-foreground">{followUp.clientEmail}</p>
                        <p className="text-sm text-muted-foreground">{followUp.clientPhone}</p>
                        <p className="text-sm mt-2">
                          <strong>Assigned to:</strong> {followUp.preparerName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Requested: {new Date(followUp.requestedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm" variant="default">
                          <PhoneCall className="w-3 h-3 mr-1" />
                          Contact Now
                        </Button>
                        <Button size="sm" variant="outline">
                          Escalate
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {accountabilityStats.totalMissedFollowUps > missedFollowUps.length && (
                  <p className="text-sm text-center text-muted-foreground pt-2">
                    + {accountabilityStats.totalMissedFollowUps - missedFollowUps.length} more
                    waiting for follow-up
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Platform Leaderboards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Top 10 Preparers Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                Top 10 Preparers
              </CardTitle>
              <CardDescription>Best performing preparers by client count</CardDescription>
            </CardHeader>
            <CardContent>
              {topPreparers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No preparer data available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topPreparers.map((preparer, index) => (
                    <div
                      key={preparer.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            index === 0
                              ? 'bg-yellow-500 text-white'
                              : index === 1
                                ? 'bg-gray-400 text-white'
                                : index === 2
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{preparer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {preparer.totalReturns} returns filed • {preparer.conversionRate}% CVR
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{preparer.totalClients} clients</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Performing Links Platform-Wide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Top 10 Marketing Links
              </CardTitle>
              <CardDescription>Best performing links by conversions</CardDescription>
            </CardHeader>
            <CardContent>
              {topLinks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <LinkIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No marketing links yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topLinks.map((link, index) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            index === 0
                              ? 'bg-yellow-500 text-white'
                              : index === 1
                                ? 'bg-gray-400 text-white'
                                : index === 2
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{link.title}</p>
                          <p className="text-xs text-muted-foreground">
                            By {link.creatorName} • {link.clicks} clicks → {link.conversions}{' '}
                            conversions
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

        {/* Analytics Charts */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Revenue (Last 7 Days)
              </CardTitle>
              <CardDescription>Daily revenue performance</CardDescription>
            </CardHeader>
            <CardContent>
              {revenueChart.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No revenue data available</p>
                </div>
              ) : (
                <div className="h-[200px] flex items-end justify-between gap-2">
                  {revenueChart.map((data, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div
                        className="w-full bg-green-500 rounded-t-lg transition-all hover:bg-green-400"
                        style={{ height: data.height }}
                      />
                      <div className="text-xs font-medium">{data.day}</div>
                      <div className="text-xs text-muted-foreground">
                        ${data.value > 0 ? (data.value / 1000).toFixed(1) + 'k' : '0'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Page Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="w-5 h-5" />
                Page Performance
              </CardTitle>
              <CardDescription>Top pages by traffic (7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {pagePerformance.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No page analytics available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pagePerformance.map((page, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate flex-1">{page.path}</span>
                        <span className="text-muted-foreground ml-2">{page.views} views</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{page.visitors} visitors</span>
                        <span>{page.bounceRate}% bounce</span>
                        <span className="text-green-600 font-medium">
                          {page.conversionRate}% CVR
                        </span>
                      </div>
                      {i < pagePerformance.length - 1 && <div className="h-px bg-border mt-2" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Content Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AI Content Performance
              </CardTitle>
              <CardDescription>AI-generated content analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{aiContentMetrics.generated}</div>
                    <p className="text-xs text-muted-foreground">Generated</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {aiContentMetrics.published}
                    </div>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                </div>
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Views</span>
                    <span className="font-medium">
                      {aiContentMetrics.totalViews.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Clicks</span>
                    <span className="font-medium">
                      {aiContentMetrics.totalClicks.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg CTR</span>
                    <span className="font-medium text-blue-600">{aiContentMetrics.avgCTR}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium text-green-600">
                      {aiContentMetrics.avgConversionRate}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Traffic Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Traffic Sources
              </CardTitle>
              <CardDescription>Visitor source breakdown (7 days)</CardDescription>
            </CardHeader>
            <CardContent>
              {trafficSources.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <p className="text-sm">No traffic data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trafficSources.map((source, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{source.source}</span>
                        <span className="text-sm text-muted-foreground">
                          {source.views} views ({source.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${source.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{activity.user}</p>
                        <p className="text-xs text-muted-foreground">{activity.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={activity.badge === 'success' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {activity.time}
                      </Badge>
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
