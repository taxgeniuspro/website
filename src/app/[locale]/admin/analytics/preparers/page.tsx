/**
 * Tax Preparer Lead Analytics
 *
 * Tracks tax preparer lead generation performance.
 * Focus: Leads, conversions, entry points - NO revenue tracking.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserPermissions } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  MousePointerClick,
  UserPlus,
  FileCheck,
  Link2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  getAllPreparersLeadPerformance,
  getTopEntryPoints,
  type Period,
} from '@/lib/services/lead-flow-analytics.service';
import { AnalyticsPeriodSelector } from '../AnalyticsPeriodSelector';

export const metadata = {
  title: 'Tax Preparer Analytics - Admin | Tax Genius Pro',
  description: 'Track individual tax preparer lead generation performance',
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

export default async function AdminPreparersAnalyticsPage({
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

  // Fetch preparer performance data
  const preparers = await getAllPreparersLeadPerformance(period);

  // Calculate aggregates
  const totalLeads = preparers.reduce((sum, p) => sum + p.leads, 0);
  const totalConversions = preparers.reduce((sum, p) => sum + p.conversions, 0);
  const activePreparers = preparers.filter((p) => p.leads > 0).length;
  const avgConversionRate =
    totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0;

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
          <h1 className="text-3xl font-bold tracking-tight">Tax Preparer Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Lead generation performance for all tax preparers
          </p>
        </div>
        <AnalyticsPeriodSelector currentPeriod={period} />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Preparers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{preparers.length}</div>
            <p className="text-xs text-muted-foreground">
              {activePreparers} active ({periodLabel})
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
            <p className="text-xs text-muted-foreground">From all preparers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Completed intakes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Lead to conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Preparer Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Preparer Performance</CardTitle>
          <CardDescription>
            Lead generation and conversion metrics by tax preparer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preparers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preparer</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Conversions</TableHead>
                  <TableHead className="text-right">Conv. Rate</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preparers.map((preparer) => {
                  const isAboveAvg = preparer.conversionRate > avgConversionRate;
                  return (
                    <TableRow key={preparer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={preparer.avatarUrl || undefined} />
                            <AvatarFallback>
                              {preparer.displayName?.charAt(0) || preparer.username?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{preparer.displayName || preparer.username}</p>
                            <p className="text-xs text-muted-foreground">@{preparer.username}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {preparer.leads.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {preparer.conversions.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            preparer.conversionRate > 50
                              ? 'text-green-600'
                              : preparer.conversionRate > 25
                                ? 'text-yellow-600'
                                : 'text-muted-foreground'
                          }
                        >
                          {preparer.conversionRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right hidden md:table-cell">
                        {preparer.leads > 0 && (
                          <Badge
                            variant="outline"
                            className={
                              isAboveAvg
                                ? 'text-green-600 border-green-200'
                                : 'text-orange-600 border-orange-200'
                            }
                          >
                            {isAboveAvg ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {isAboveAvg ? 'Above Avg' : 'Below Avg'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No preparer data available for this period
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
              <UserPlus className="h-5 w-5 text-purple-600" />
              Top by Lead Generation
            </CardTitle>
            <CardDescription>Preparers bringing in the most leads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {preparers
                .sort((a, b) => b.leads - a.leads)
                .slice(0, 5)
                .map((preparer, index) => (
                  <div key={preparer.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600 font-semibold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={preparer.avatarUrl || undefined} />
                        <AvatarFallback>
                          {preparer.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{preparer.displayName || preparer.username}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{preparer.leads} leads</p>
                      <p className="text-xs text-muted-foreground">
                        {preparer.conversions} converted
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Top by Conversion Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top by Conversion Rate
            </CardTitle>
            <CardDescription>Preparers with highest conversion efficiency</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {preparers
                .filter((p) => p.leads >= 5) // Minimum leads for meaningful rate
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 5)
                .map((preparer, index) => (
                  <div key={preparer.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-600 font-semibold">
                        {index + 1}
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={preparer.avatarUrl || undefined} />
                        <AvatarFallback>
                          {preparer.displayName?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{preparer.displayName || preparer.username}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {preparer.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {preparer.conversions}/{preparer.leads} leads
                      </p>
                    </div>
                  </div>
                ))}
              {preparers.filter((p) => p.leads >= 5).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Need at least 5 leads for conversion rate ranking
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
