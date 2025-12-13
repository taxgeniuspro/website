/**
 * Affiliate Lead & Commission Analytics
 *
 * Tracks affiliate performance focused on:
 * - Lead generation and conversions
 * - Commission tracking (predetermined amounts)
 * - Sub-affiliate relationships
 * - Payout status
 *
 * Does NOT track tax preparer revenue from tax services.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  UserPlus,
  FileCheck,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  GitBranch,
} from 'lucide-react';
import {
  getAllAffiliatesLeadPerformance,
  getCommissionSummary,
  getSubAffiliateTree,
  type Period,
} from '@/lib/services/lead-flow-analytics.service';
import { AnalyticsPeriodSelector } from '../AnalyticsPeriodSelector';

export const metadata = {
  title: 'Affiliate Analytics - Admin | Tax Genius Pro',
  description: 'Track affiliate lead generation, commissions, and sub-affiliate performance',
};

async function checkAdminAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user) return { hasAccess: false };

  const role = user?.role as string;
  const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
  const permissions = getUserPermissions(role as any, customPermissions);
  const hasAccess = role === 'admin' && permissions.analytics;

  return { hasAccess, permissions };
}

export default async function AdminAffiliatesAnalyticsPage({
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

  // Fetch affiliate performance and commission data
  const [affiliates, commissions] = await Promise.all([
    getAllAffiliatesLeadPerformance(period),
    getCommissionSummary(period),
  ]);

  // Calculate aggregates
  const totalLeads = affiliates.reduce((sum, a) => sum + a.leads, 0);
  const totalConversions = affiliates.reduce((sum, a) => sum + a.conversions, 0);
  const activeAffiliates = affiliates.filter((a) => a.leads > 0).length;
  const avgConversionRate =
    totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;
  const totalEarned = affiliates.reduce((sum, a) => sum + a.totalCommissions, 0);
  const totalPending = affiliates.reduce((sum, a) => sum + a.pendingCommissions, 0);

  const periodLabel =
    period === '7d'
      ? 'Last 7 days'
      : period === '30d'
        ? 'Last 30 days'
        : period === '90d'
          ? 'Last 90 days'
          : 'All time';

  // Get affiliates that have sub-affiliates
  const affiliatesWithSubs = affiliates.filter((a) => a.referrerUsername);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Lead generation, commissions, and sub-affiliate tracking
          </p>
        </div>
        <AnalyticsPeriodSelector currentPeriod={period} />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliates.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeAffiliates} active ({periodLabel})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all affiliates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {avgConversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sub-Affiliates</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{affiliatesWithSubs.length}</div>
            <p className="text-xs text-muted-foreground">With referral chains</p>
          </CardContent>
        </Card>
      </div>

      {/* Commission Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${totalEarned.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.total.count} commissions
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ${totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.pending.count} awaiting
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${commissions.approved.amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.approved.count} ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${commissions.paid.amount.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissions.paid.count} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Performance</CardTitle>
          <CardDescription>
            Lead generation and commission tracking by affiliate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {affiliates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Referred By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate) => {
                  const isAboveAvg = affiliate.conversionRate > avgConversionRate;
                  return (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={affiliate.avatarUrl || undefined} />
                            <AvatarFallback>
                              {affiliate.displayName?.charAt(0) || affiliate.username?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{affiliate.displayName || affiliate.username}</p>
                            <Badge
                              variant="outline"
                              className={
                                affiliate.role === 'tax_preparer'
                                  ? 'text-purple-600 border-purple-200'
                                  : 'text-orange-600 border-orange-200'
                              }
                            >
                              {affiliate.role === 'tax_preparer' ? 'Preparer' : 'Client'}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {affiliate.leads.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {affiliate.conversions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span
                            className={
                              affiliate.conversionRate > 50
                                ? 'text-green-600'
                                : affiliate.conversionRate > 25
                                  ? 'text-yellow-600'
                                  : 'text-muted-foreground'
                            }
                          >
                            {affiliate.conversionRate.toFixed(1)}%
                          </span>
                          {affiliate.leads > 0 && (
                            isAboveAvg ? (
                              <ArrowUpRight className="h-3 w-3 text-green-600" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 text-orange-600" />
                            )
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        ${affiliate.totalCommissions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600">
                        ${affiliate.pendingCommissions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {affiliate.referrerUsername ? (
                          <span className="text-xs text-muted-foreground">
                            @{affiliate.referrerUsername}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No affiliate data available for this period
            </p>
          )}
        </CardContent>
      </Card>

      {/* Top Performers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top by Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-orange-600" />
              Top Lead Generators
            </CardTitle>
            <CardDescription>Affiliates bringing in the most leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {affiliates
                .sort((a, b) => b.leads - a.leads)
                .slice(0, 5)
                .map((affiliate, index) => (
                  <div key={affiliate.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-600 font-semibold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={affiliate.avatarUrl || undefined} />
                        <AvatarFallback>
                          {affiliate.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{affiliate.displayName || affiliate.username}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{affiliate.leads} leads</p>
                      <p className="text-xs text-muted-foreground">
                        {affiliate.conversions} converted
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top by Earnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Top Earners
            </CardTitle>
            <CardDescription>Affiliates with highest commissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {affiliates
                .sort((a, b) => b.totalCommissions - a.totalCommissions)
                .slice(0, 5)
                .map((affiliate, index) => (
                  <div key={affiliate.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 font-semibold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={affiliate.avatarUrl || undefined} />
                        <AvatarFallback>
                          {affiliate.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{affiliate.displayName || affiliate.username}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${affiliate.totalCommissions.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${affiliate.pendingCommissions.toLocaleString()} pending
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-Affiliate Relationships */}
      {affiliatesWithSubs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Sub-Affiliate Relationships
            </CardTitle>
            <CardDescription>
              Affiliates who were referred by other affiliates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {affiliatesWithSubs.slice(0, 10).map((affiliate) => (
                <div
                  key={affiliate.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={affiliate.avatarUrl || undefined} />
                      <AvatarFallback>
                        {affiliate.displayName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{affiliate.displayName || affiliate.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Referred by @{affiliate.referrerUsername}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{affiliate.leads} leads</p>
                    <p className="text-xs text-green-600">
                      ${affiliate.totalCommissions.toLocaleString()} earned
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
