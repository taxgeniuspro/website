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
  Gift,
} from 'lucide-react';
import { getClientsReferralAnalytics } from '@/lib/services/lead-analytics.service';
import { LeadMetricCard } from '@/components/admin/analytics/LeadMetricCard';
import {
  PerformanceTable,
  type Column,
  type PerformanceData,
} from '@/components/admin/analytics/PerformanceTable';
import { createFunnelStages } from '@/lib/utils/analytics';
import { ConversionFunnelChart } from '@/components/admin/analytics/ConversionFunnelChart';
import { ExportButton } from '@/components/admin/analytics/ExportButton';
import { ClientFilterBar } from './ClientFilterBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export const metadata = {
  title: 'Client Referral Analytics - Admin | Tax Genius Pro',
  description: 'Track client referral program performance and rewards',
};

async function checkAdminAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, role: null };

  const role = user?.role as string;
  const hasAccess = role === 'admin' || role === 'super_admin';

  return { hasAccess, userId: user.id, role };
}

export default async function AdminClientsAnalyticsPage({
  searchParams,
}: {
  searchParams: { clientId?: string };
}) {
  const { hasAccess, userId, role } = await checkAdminAccess();

  if (!hasAccess || !userId) {
    redirect('/forbidden');
  }

  // Get filter from URL
  const filterClientId = searchParams.clientId || undefined;

  // Fetch clients referral analytics (filtered or all)
  const clientsData = await getClientsReferralAnalytics(userId, role as UserRole, filterClientId);

  // Calculate aggregate metrics
  const totalClicks = clientsData.reduce((sum, c) => sum + c.clicks, 0);
  const totalLeads = clientsData.reduce((sum, c) => sum + c.leads, 0);
  const totalConversions = clientsData.reduce((sum, c) => sum + c.conversions, 0);
  const totalReturnsFiled = clientsData.reduce((sum, c) => sum + c.returnsFiled, 0);
  const totalRevenue = clientsData.reduce((sum, c) => sum + c.revenue, 0);
  const totalRewards = clientsData.reduce((sum, c) => sum + c.rewardsEarned, 0);
  const totalReferralLinks = clientsData.reduce((sum, c) => sum + c.referralLinksCount, 0);
  const avgConversionRate =
    clientsData.length > 0
      ? clientsData.reduce((sum, c) => sum + c.conversionRate, 0) / clientsData.length
      : 0;

  // Create funnel data
  const funnelStages = createFunnelStages(
    totalClicks,
    totalLeads,
    totalConversions,
    totalReturnsFiled
  );

  // Prepare table data
  const tableData: PerformanceData[] = clientsData.map((client) => ({
    id: client.clientId,
    name: client.clientName,
    email: client.clientEmail,
    referralLinks: client.referralLinksCount,
    clicks: client.clicks,
    leads: client.leads,
    conversions: client.conversions,
    returnsFiled: client.returnsFiled,
    conversionRate: client.conversionRate,
    revenue: client.revenue,
    rewards: client.rewardsEarned,
    lastActive: client.lastActive,
  }));

  // Define table columns
  const columns: Column[] = [
    { key: 'name', label: 'Client', sortable: true },
    { key: 'email', label: 'Email', sortable: true, className: 'hidden md:table-cell' },
    { key: 'referralLinks', label: 'Links', sortable: true, format: 'number' },
    { key: 'clicks', label: 'Clicks', sortable: true, format: 'number' },
    { key: 'leads', label: 'Referrals', sortable: true, format: 'number' },
    { key: 'conversions', label: 'Conversions', sortable: true, format: 'number' },
    {
      key: 'conversionRate',
      label: 'Conv. Rate',
      sortable: true,
      format: 'percent',
      className: 'hidden lg:table-cell',
    },
    { key: 'revenue', label: 'Revenue', sortable: true, format: 'currency' },
    { key: 'rewards', label: 'Rewards', sortable: true, format: 'currency' },
  ];

  // Prepare export data
  const exportData = clientsData.map((c) => ({
    clientId: c.clientId,
    clientName: c.clientName,
    clientEmail: c.clientEmail,
    referralLinksCount: c.referralLinksCount,
    clicks: c.clicks,
    leads: c.leads,
    conversions: c.conversions,
    returnsFiled: c.returnsFiled,
    conversionRate: c.conversionRate,
    revenue: c.revenue,
    rewardsEarned: c.rewardsEarned,
    rewardsPending: c.rewardsPending,
    lastActive: c.lastActive?.toISOString() || 'Never',
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Client Referral Analytics</h1>
            <p className="text-muted-foreground mt-1">
              {filterClientId
                ? 'Viewing individual client referral performance'
                : 'Referral program metrics for all clients'}
            </p>
          </div>
          <ExportButton
            data={exportData}
            filename={
              filterClientId
                ? `client-referral-analytics-${filterClientId}`
                : 'all-client-referrals-analytics'
            }
            variant="default"
          />
        </div>

        {/* Filter Bar */}
        <ClientFilterBar
          clients={clientsData.map((c) => ({
            id: c.clientId,
            name: c.clientName,
            email: c.clientEmail,
          }))}
          currentClientId={filterClientId}
        />
      </div>

      {/* Aggregate Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Active Referrers"
          value={clientsData.length}
          icon="users"
          color="blue"
          format="number"
          subtitle={`${totalReferralLinks} referral links`}
        />
        <LeadMetricCard
          title="Total Clicks"
          value={totalClicks}
          icon="mouse-pointer-click"
          color="purple"
          format="number"
        />
        <LeadMetricCard
          title="Total Referrals"
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

      {/* Reward Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Total Rewards Paid"
          value={totalRewards}
          icon="gift"
          color="green"
          format="currency"
        />
        <LeadMetricCard
          title="Conversions"
          value={totalConversions}
          icon="file-check"
          color="blue"
          format="number"
        />
        <LeadMetricCard
          title="Returns Filed"
          value={totalReturnsFiled}
          icon="trending-up"
          color="purple"
          format="number"
        />
        <LeadMetricCard
          title="Avg Revenue per Client"
          value={clientsData.length > 0 ? totalRevenue / clientsData.length : 0}
          icon="dollar-sign"
          color="orange"
          format="currency"
        />
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnelChart
        stages={funnelStages}
        title={
          filterClientId ? 'Individual Client Referral Funnel' : 'Aggregate Client Referral Funnel'
        }
        subtitle={
          filterClientId
            ? `Referral performance for ${clientsData[0]?.clientName || 'selected client'}`
            : 'Combined referral performance across all clients'
        }
      />

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Referral Performance</CardTitle>
          <CardDescription>
            {filterClientId
              ? 'Detailed metrics for selected client'
              : 'Compare referral performance across all clients'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PerformanceTable
            data={tableData}
            columns={columns}
            emptyMessage="No client referral data available"
          />
        </CardContent>
      </Card>

      {/* Recent Referrals (for filtered view) */}
      {filterClientId && clientsData.length > 0 && clientsData[0].recentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Referrals</CardTitle>
            <CardDescription>Latest referrals from {clientsData[0].clientName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientsData[0].recentLeads.map((lead) => (
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
      {filterClientId && clientsData.length > 0 && clientsData[0].linkBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Referral Link Performance</CardTitle>
            <CardDescription>
              Individual link metrics for {clientsData[0].clientName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clientsData[0].linkBreakdown.map((link) => (
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
                      <p className="text-muted-foreground text-xs">Referrals</p>
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
