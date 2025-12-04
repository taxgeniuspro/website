import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  Target,
  MousePointerClick,
  UserPlus,
  FileCheck,
  DollarSign,
  Link2,
  TrendingUp,
  Award,
} from 'lucide-react';
import { getAffiliatesAnalytics } from '@/lib/services/lead-analytics.service';
import { LeadMetricCard } from '@/components/admin/analytics/LeadMetricCard';
import {
  PerformanceTable,
  type Column,
  type PerformanceData,
} from '@/components/admin/analytics/PerformanceTable';
import { createFunnelStages } from '@/lib/utils/analytics';
import { ConversionFunnelChart } from '@/components/admin/analytics/ConversionFunnelChart';
import { ExportButton } from '@/components/admin/analytics/ExportButton';
import { AffiliateFilterBar } from './AffiliateFilterBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = {
  title: 'Affiliate Analytics - Admin | Tax Genius Pro',
  description: 'Track affiliate partner lead generation and commission performance',
};

async function checkAdminAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, role: null };

  const role = user?.role as string;
  const hasAccess = role === 'admin' || role === 'super_admin';

  return { hasAccess, userId: user.id, role };
}

export default async function AdminAffiliatesAnalyticsPage({
  searchParams,
}: {
  searchParams: { affiliateId?: string };
}) {
  const { hasAccess, userId, role } = await checkAdminAccess();

  if (!hasAccess || !userId) {
    redirect('/forbidden');
  }

  // Get filter from URL
  const filterAffiliateId = searchParams.affiliateId || undefined;

  // Fetch affiliates analytics (filtered or all)
  const affiliatesData = await getAffiliatesAnalytics(userId, role as UserRole, filterAffiliateId);

  // Calculate aggregate metrics
  const totalClicks = affiliatesData.reduce((sum, a) => sum + a.clicks, 0);
  const totalLeads = affiliatesData.reduce((sum, a) => sum + a.leads, 0);
  const totalConversions = affiliatesData.reduce((sum, a) => sum + a.conversions, 0);
  const totalReturnsFiled = affiliatesData.reduce((sum, a) => sum + a.returnsFiled, 0);
  const totalRevenue = affiliatesData.reduce((sum, a) => sum + a.revenue, 0);
  const totalCommissions = affiliatesData.reduce((sum, a) => sum + a.commissionsEarned, 0);
  const totalMarketingLinks = affiliatesData.reduce((sum, a) => sum + a.marketingLinksCount, 0);
  const avgConversionRate =
    affiliatesData.length > 0
      ? affiliatesData.reduce((sum, a) => sum + a.conversionRate, 0) / affiliatesData.length
      : 0;

  // Create funnel data
  const funnelStages = createFunnelStages(
    totalClicks,
    totalLeads,
    totalConversions,
    totalReturnsFiled
  );

  // Prepare table data
  const tableData: PerformanceData[] = affiliatesData.map((affiliate) => ({
    id: affiliate.affiliateId,
    name: affiliate.affiliateName,
    email: affiliate.affiliateEmail,
    marketingLinks: affiliate.marketingLinksCount,
    clicks: affiliate.clicks,
    leads: affiliate.leads,
    conversions: affiliate.conversions,
    returnsFiled: affiliate.returnsFiled,
    conversionRate: affiliate.conversionRate,
    revenue: affiliate.revenue,
    commissions: affiliate.commissionsEarned,
    lastActive: affiliate.lastActive,
  }));

  // Define table columns
  const columns: Column[] = [
    { key: 'name', label: 'Affiliate', sortable: true },
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
    { key: 'commissions', label: 'Commissions', sortable: true, format: 'currency' },
  ];

  // Prepare export data
  const exportData = affiliatesData.map((a) => ({
    affiliateId: a.affiliateId,
    affiliateName: a.affiliateName,
    affiliateEmail: a.affiliateEmail,
    marketingLinksCount: a.marketingLinksCount,
    clicks: a.clicks,
    leads: a.leads,
    conversions: a.conversions,
    returnsFiled: a.returnsFiled,
    conversionRate: a.conversionRate,
    revenue: a.revenue,
    commissionsEarned: a.commissionsEarned,
    commissionsPending: a.commissionsPending,
    lastActive: a.lastActive?.toISOString() || 'Never',
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Affiliate Analytics</h1>
            <p className="text-muted-foreground mt-1">
              {filterAffiliateId
                ? 'Viewing individual affiliate performance'
                : 'Performance metrics for all affiliate partners'}
            </p>
          </div>
          <ExportButton
            data={exportData}
            filename={
              filterAffiliateId
                ? `affiliate-analytics-${filterAffiliateId}`
                : 'all-affiliates-analytics'
            }
            variant="default"
          />
        </div>

        {/* Filter Bar */}
        <AffiliateFilterBar
          affiliates={affiliatesData.map((a) => ({
            id: a.affiliateId,
            name: a.affiliateName,
            email: a.affiliateEmail,
          }))}
          currentAffiliateId={filterAffiliateId}
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
          subtitle={`${affiliatesData.length} affiliate${affiliatesData.length !== 1 ? 's' : ''}`}
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

      {/* Commission Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Total Commissions Paid"
          value={totalCommissions}
          icon="award"
          color="green"
          format="currency"
        />
        <LeadMetricCard
          title="Returns Filed"
          value={totalReturnsFiled}
          icon="file-check"
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
          title="Avg Revenue per Affiliate"
          value={affiliatesData.length > 0 ? totalRevenue / affiliatesData.length : 0}
          icon="dollar-sign"
          color="orange"
          format="currency"
        />
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnelChart
        stages={funnelStages}
        title={
          filterAffiliateId
            ? 'Individual Affiliate Conversion Funnel'
            : 'Aggregate Affiliate Conversion Funnel'
        }
        subtitle={
          filterAffiliateId
            ? `Performance breakdown for ${affiliatesData[0]?.affiliateName || 'selected affiliate'}`
            : 'Combined performance across all affiliate partners'
        }
      />

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Performance</CardTitle>
          <CardDescription>
            {filterAffiliateId
              ? 'Detailed metrics for selected affiliate'
              : 'Compare performance across all affiliates'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTable
            data={tableData}
            columns={columns}
            emptyMessage="No affiliate data available"
          />
        </CardContent>
      </Card>

      {/* Recent Leads (for filtered view) */}
      {filterAffiliateId &&
        affiliatesData.length > 0 &&
        affiliatesData[0].recentLeads.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>
                Latest leads generated by {affiliatesData[0].affiliateName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {affiliatesData[0].recentLeads.map((lead) => (
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
      {filterAffiliateId &&
        affiliatesData.length > 0 &&
        affiliatesData[0].linkBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Marketing Link Performance</CardTitle>
              <CardDescription>
                Individual link metrics for {affiliatesData[0].affiliateName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {affiliatesData[0].linkBreakdown.map((link) => (
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
