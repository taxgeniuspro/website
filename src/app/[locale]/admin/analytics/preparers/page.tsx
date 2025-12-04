import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  Users,
  MousePointerClick,
  UserPlus,
  FileCheck,
  DollarSign,
  Link2,
  TrendingUp,
} from 'lucide-react';
import { getPreparersAnalytics } from '@/lib/services/lead-analytics.service';
import { LeadMetricCard } from '@/components/admin/analytics/LeadMetricCard';
import {
  PerformanceTable,
  type Column,
  type PerformanceData,
} from '@/components/admin/analytics/PerformanceTable';
import { createFunnelStages } from '@/lib/utils/analytics';
import { ConversionFunnelChart } from '@/components/admin/analytics/ConversionFunnelChart';
import { ExportButton } from '@/components/admin/analytics/ExportButton';
import { PreparerFilterBar } from './PreparerFilterBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = {
  title: 'Tax Preparer Analytics - Admin | Tax Genius Pro',
  description: 'Track individual tax preparer lead generation performance',
};

async function checkAdminAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, role: null };

  const role = user?.role as string;
  const hasAccess = role === 'admin' || role === 'super_admin';

  return { hasAccess, userId: user.id, role };
}

export default async function AdminPreparersAnalyticsPage({
  searchParams,
}: {
  searchParams: { preparerId?: string };
}) {
  const { hasAccess, userId, role } = await checkAdminAccess();

  if (!hasAccess || !userId) {
    redirect('/forbidden');
  }

  // Get filter from URL
  const filterPreparerId = searchParams.preparerId || undefined;

  // Fetch preparers analytics (filtered or all)
  const preparersData = await getPreparersAnalytics(userId, role as UserRole, filterPreparerId);

  // Calculate aggregate metrics
  const totalClicks = preparersData.reduce((sum, p) => sum + p.clicks, 0);
  const totalLeads = preparersData.reduce((sum, p) => sum + p.leads, 0);
  const totalConversions = preparersData.reduce((sum, p) => sum + p.conversions, 0);
  const totalReturnsFiled = preparersData.reduce((sum, p) => sum + p.returnsFiled, 0);
  const totalRevenue = preparersData.reduce((sum, p) => sum + p.revenue, 0);
  const totalMarketingLinks = preparersData.reduce((sum, p) => sum + p.marketingLinksCount, 0);
  const avgConversionRate =
    preparersData.length > 0
      ? preparersData.reduce((sum, p) => sum + p.conversionRate, 0) / preparersData.length
      : 0;

  // Create funnel data
  const funnelStages = createFunnelStages(
    totalClicks,
    totalLeads,
    totalConversions,
    totalReturnsFiled
  );

  // Prepare table data
  const tableData: PerformanceData[] = preparersData.map((preparer) => ({
    id: preparer.preparerId,
    name: preparer.preparerName,
    email: preparer.preparerEmail,
    marketingLinks: preparer.marketingLinksCount,
    clicks: preparer.clicks,
    leads: preparer.leads,
    conversions: preparer.conversions,
    returnsFiled: preparer.returnsFiled,
    conversionRate: preparer.conversionRate,
    revenue: preparer.revenue,
    lastActive: preparer.lastActive,
  }));

  // Define table columns
  const columns: Column[] = [
    { key: 'name', label: 'Preparer', sortable: true },
    { key: 'email', label: 'Email', sortable: true, className: 'hidden md:table-cell' },
    { key: 'marketingLinks', label: 'Links', sortable: true, format: 'number' },
    { key: 'clicks', label: 'Clicks', sortable: true, format: 'number' },
    { key: 'leads', label: 'Leads', sortable: true, format: 'number' },
    { key: 'conversions', label: 'Conversions', sortable: true, format: 'number' },
    {
      key: 'conversionRate',
      label: 'Conv. Rate',
      sortable: true,
      format: 'percent',
      className: 'hidden lg:table-cell',
    },
    { key: 'revenue', label: 'Revenue', sortable: true, format: 'currency' },
  ];

  // Prepare export data
  const exportData = preparersData.map((p) => ({
    preparerId: p.preparerId,
    preparerName: p.preparerName,
    preparerEmail: p.preparerEmail,
    marketingLinksCount: p.marketingLinksCount,
    clicks: p.clicks,
    leads: p.leads,
    conversions: p.conversions,
    returnsFiled: p.returnsFiled,
    conversionRate: p.conversionRate,
    revenue: p.revenue,
    lastActive: p.lastActive?.toISOString() || 'Never',
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax Preparer Analytics</h1>
            <p className="text-muted-foreground mt-1">
              {filterPreparerId
                ? 'Viewing individual preparer performance'
                : 'Performance metrics for all tax preparers'}
            </p>
          </div>
          <ExportButton
            data={exportData}
            filename={
              filterPreparerId
                ? `preparer-analytics-${filterPreparerId}`
                : 'all-preparers-analytics'
            }
            variant="default"
          />
        </div>

        {/* Filter Bar */}
        <PreparerFilterBar
          preparers={preparersData.map((p) => ({
            id: p.preparerId,
            name: p.preparerName,
            email: p.preparerEmail,
          }))}
          currentPreparerId={filterPreparerId}
        />
      </div>

      {/* Aggregate Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Total Marketing Links"
          value={totalMarketingLinks}
          icon="link-2"
          color="blue"
          format="number"
          subtitle={`${preparersData.length} preparer${preparersData.length !== 1 ? 's' : ''}`}
        />
        <LeadMetricCard
          title="Total Clicks"
          value={totalClicks}
          icon="mouse-pointer-click"
          color="purple"
          format="number"
        />
        <LeadMetricCard
          title="Total Leads"
          value={totalLeads}
          icon="user-plus"
          color="green"
          format="number"
        />
        <LeadMetricCard
          title="Total Revenue"
          value={totalRevenue}
          icon="dollar-sign"
          color="yellow"
          format="currency"
          subtitle={`${avgConversionRate.toFixed(1)}% avg conversion`}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Conversions"
          value={totalConversions}
          icon="file-check"
          color="green"
          format="number"
        />
        <LeadMetricCard
          title="Returns Filed"
          value={totalReturnsFiled}
          icon="trending-up"
          color="blue"
          format="number"
        />
        <LeadMetricCard
          title="Avg Conversion Rate"
          value={avgConversionRate.toFixed(1)}
          icon="trending-up"
          color="purple"
          format="percent"
        />
        <LeadMetricCard
          title="Avg Revenue per Preparer"
          value={preparersData.length > 0 ? totalRevenue / preparersData.length : 0}
          icon="dollar-sign"
          color="orange"
          format="currency"
        />
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnelChart
        stages={funnelStages}
        title={
          filterPreparerId
            ? 'Individual Preparer Conversion Funnel'
            : 'Aggregate Preparer Conversion Funnel'
        }
        subtitle={
          filterPreparerId
            ? `Performance breakdown for ${preparersData[0]?.preparerName || 'selected preparer'}`
            : 'Combined performance across all tax preparers'
        }
      />

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Preparer Performance</CardTitle>
          <CardDescription>
            {filterPreparerId
              ? 'Detailed metrics for selected preparer'
              : 'Compare performance across all preparers'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTable
            data={tableData}
            columns={columns}
            emptyMessage="No preparer data available"
          />
        </CardContent>
      </Card>

      {/* Recent Leads (for filtered view) */}
      {filterPreparerId && preparersData.length > 0 && preparersData[0].recentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>
              Latest leads generated by {preparersData[0].preparerName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {preparersData[0].recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {lead.status === 'CONVERTED' ? '✓ Converted' : 'In Progress'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Link Performance (for filtered view) */}
      {filterPreparerId &&
        preparersData.length > 0 &&
        preparersData[0].linkBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Marketing Link Performance</CardTitle>
              <CardDescription>
                Individual link metrics for {preparersData[0].preparerName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {preparersData[0].linkBreakdown.map((link) => (
                  <div key={link.linkId} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{link.linkName}</p>
                      <span className="text-xs text-muted-foreground">
                        {link.conversionRate.toFixed(1)}% conversion
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Clicks</p>
                        <p className="font-semibold">{link.clicks}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Leads</p>
                        <p className="font-semibold">{link.leads}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Conversions</p>
                        <p className="font-semibold">{link.conversions}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Revenue</p>
                        <p className="font-semibold">${link.revenue.toLocaleString()}</p>
                      </div>
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
