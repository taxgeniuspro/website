/**
 * Lead Flow Analytics Overview
 *
 * Admin dashboard for tracking lead generation performance.
 * Focus: Lead status, conversion rates, entry points, top performers.
 *
 * Does NOT track tax preparer revenue from tax services.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Target,
  TrendingUp,
  MousePointerClick,
  UserPlus,
  FileCheck,
  ArrowRight,
  ExternalLink,
  DollarSign,
  Clock,
} from 'lucide-react';
import {
  getLeadPipelineSummary,
  getConversionFunnel,
  getTopEntryPoints,
  getTopPerformers,
  getLeadsBySource,
  getCommissionSummary,
  type Period,
} from '@/lib/services/lead-flow-analytics.service';
import { AnalyticsPeriodSelector } from './AnalyticsPeriodSelector';

export const metadata = {
  title: 'Lead Analytics Overview - Admin | Tax Genius Pro',
  description: 'Track lead generation performance across all sources',
};

async function checkAdminAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user) return { hasAccess: false };

  const role = user?.role as string;
  const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
  const permissions = getUserPermissions(role as any, customPermissions);
  const hasAccess = role === 'admin' && permissions.analytics;

  return { hasAccess, role, permissions };
}

export default async function AdminAnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { hasAccess, permissions } = await checkAdminAccess();

  if (!hasAccess || !permissions) {
    redirect('/forbidden');
  }

  const params = await searchParams;
  const period = (params.period as Period) || '30d';

  // Fetch all analytics data in parallel with error handling
  let pipeline, funnel, entryPoints, performers, sources, commissions;

  try {
    [pipeline, funnel, entryPoints, performers, sources, commissions] = await Promise.all([
      getLeadPipelineSummary(period),
      getConversionFunnel(period),
      getTopEntryPoints(10, period),
      getTopPerformers(10, period),
      getLeadsBySource(period),
      getCommissionSummary(period),
    ]);
  } catch (error) {
    console.error('Analytics data fetch error:', error);
    // Return default empty values if data fetch fails
    pipeline = { pipeline: { NEW: 0, CONTACTED: 0, QUALIFIED: 0, CONVERTED: 0, DISQUALIFIED: 0 }, total: 0 };
    funnel = { clicks: 0, leads: 0, intakeStarts: 0, intakeCompletes: 0, returnsFiled: 0, conversionRates: { clickToLead: 0, leadToIntake: 0, intakeToComplete: 0, overallConversion: 0 } };
    entryPoints = [];
    performers = [];
    sources = [];
    commissions = { total: { amount: 0, count: 0 }, pending: { amount: 0, count: 0 }, approved: { amount: 0, count: 0 }, paid: { amount: 0, count: 0 } };
  }

  const periodLabel =
    period === '7d'
      ? 'Last 7 days'
      : period === '30d'
        ? 'Last 30 days'
        : period === '90d'
          ? 'Last 90 days'
          : 'All time';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Analytics Overview</h1>
          <p className="text-muted-foreground mt-1">
            Track lead flow and conversion performance across all sources
          </p>
        </div>
        <AnalyticsPeriodSelector currentPeriod={period} />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipeline.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnel.intakeCompletes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {funnel.conversionRates.overallConversion.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funnel.clicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all marketing links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Commissions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${commissions.pending.amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.pending.count} awaiting payout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
          <CardDescription>Current status of all leads in the funnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {Object.entries(pipeline.pipeline).map(([status, count]) => {
              const percentage = pipeline.total > 0 ? (count / pipeline.total) * 100 : 0;
              const statusColors: Record<string, string> = {
                NEW: 'bg-blue-500',
                CONTACTED: 'bg-yellow-500',
                QUALIFIED: 'bg-purple-500',
                CONVERTED: 'bg-green-500',
                DISQUALIFIED: 'bg-red-500',
              };

              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{status}</span>
                    <span className="text-sm text-muted-foreground">{count}</span>
                  </div>
                  <Progress value={percentage} className={statusColors[status]} />
                  <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>Track leads through each stage of the funnel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2">
            {/* Clicks */}
            <div className="flex-1 text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
              <MousePointerClick className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{funnel.clicks.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Clicks</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* Leads */}
            <div className="flex-1 text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950">
              <UserPlus className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{funnel.leads.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Leads</p>
              <p className="text-xs text-green-600">{funnel.conversionRates.clickToLead.toFixed(1)}%</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* Intake Started */}
            <div className="flex-1 text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <FileCheck className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
              <div className="text-2xl font-bold">{funnel.intakeStarts.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Intake Started</p>
              <p className="text-xs text-green-600">{funnel.conversionRates.leadToIntake.toFixed(1)}%</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />

            {/* Intake Completed */}
            <div className="flex-1 text-center p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{funnel.intakeCompletes.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-xs text-green-600">{funnel.conversionRates.intakeToComplete.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Entry Points */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Top Entry Points
            </CardTitle>
            <CardDescription>Marketing links bringing the most leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {entryPoints.length > 0 ? (
                entryPoints.slice(0, 5).map((link, index) => (
                  <div key={link.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{link.title || link.code}</p>
                        <p className="text-xs text-muted-foreground">{link.targetPage}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{link.conversions} leads</p>
                      <p className="text-xs text-muted-foreground">
                        {link.clicks} clicks ({link.conversionRate.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No marketing links data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Performers
            </CardTitle>
            <CardDescription>Preparers and affiliates with most leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performers.length > 0 ? (
                performers.slice(0, 5).map((performer, index) => (
                  <div key={performer.username} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={performer.avatarUrl || undefined} />
                        <AvatarFallback>
                          {performer.displayName?.charAt(0) || performer.username?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{performer.displayName || performer.username}</p>
                        <Badge
                          variant="outline"
                          className={
                            performer.type === 'TAX_PREPARER'
                              ? 'text-purple-600 border-purple-200'
                              : 'text-orange-600 border-orange-200'
                          }
                        >
                          {performer.type === 'TAX_PREPARER' ? 'Preparer' : 'Affiliate'}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{performer.leads} leads</p>
                      <p className="text-xs text-muted-foreground">
                        {performer.conversions} converted ({performer.conversionRate.toFixed(1)}%)
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No performer data yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
            <CardDescription>Distribution of leads across channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sources.map((source) => (
                <div key={source.source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-sm font-medium">{source.source}</span>
                    </div>
                    <span className="text-sm">
                      {source.count} ({source.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress
                    value={source.percentage}
                    className="h-2"
                    style={
                      { '--progress-color': source.color } as React.CSSProperties
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commission Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Commission Summary
            </CardTitle>
            <CardDescription>Affiliate earnings and payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">${commissions.total.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{commissions.total.count} commissions</p>
              </div>
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  ${commissions.pending.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{commissions.pending.count} awaiting</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${commissions.approved.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{commissions.approved.count} ready</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-2xl font-bold text-green-600">
                  ${commissions.paid.amount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{commissions.paid.count} completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links to Detailed Pages */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/analytics/preparers"
          className="block p-6 border rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Tax Preparer Analytics</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View individual preparer lead performance and conversion rates
          </p>
        </Link>

        <Link
          href="/admin/analytics/affiliates"
          className="block p-6 border rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold">Affiliate Analytics</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Track affiliate performance, commissions, and sub-affiliate relationships
          </p>
        </Link>
      </div>
    </div>
  );
}
