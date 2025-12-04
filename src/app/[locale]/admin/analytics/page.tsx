import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getUserPermissions, type UserPermissions } from '@/lib/permissions';
import { getCompanyLeadsSummary } from '@/lib/services/lead-analytics.service';
import {
  getTrafficMetrics,
  getTrafficSources,
  getDeviceCategories,
} from '@/lib/services/google-analytics.service';
import {
  getSearchMetrics,
  getTopQueries,
  getTopPages,
} from '@/lib/services/search-console.service';
import { getCoreWebVitals } from '@/lib/services/pagespeed-insights.service';
import { LeadMetricCard } from '@/components/admin/analytics/LeadMetricCard';
import { GA4MetricsCard } from '@/components/admin/analytics/GA4MetricsCard';
import { TrafficSourcesChart } from '@/components/admin/analytics/TrafficSourcesChart';
import { DeviceCategoryChart } from '@/components/admin/analytics/DeviceCategoryChart';
import { SearchMetricsCard } from '@/components/admin/analytics/SearchMetricsCard';
import { TopQueriesChart } from '@/components/admin/analytics/TopQueriesChart';
import { TopPagesChart } from '@/components/admin/analytics/TopPagesChart';
import { CoreWebVitalsCard } from '@/components/admin/analytics/CoreWebVitalsCard';
import { createFunnelStages } from '@/lib/utils/analytics';
import { ConversionFunnelChart } from '@/components/admin/analytics/ConversionFunnelChart';
import { SourceBreakdownChart } from '@/components/admin/analytics/SourceBreakdownChart';
import { createSourceBreakdown } from '@/lib/utils/source-breakdown';
import { ExportButton } from '@/components/admin/analytics/ExportButton';
import { AnalyticsPeriodSelector } from './AnalyticsPeriodSelector';
import type { Period } from '@/components/admin/analytics/PeriodToggle';

export const metadata = {
  title: 'Lead Generation Analytics - Admin | Tax Genius Pro',
  description: 'Track lead generation performance across all sources',
};

async function checkAdminAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, role: null, permissions: null };

  const role = user?.role as string;
  const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
  const permissions = getUserPermissions(role as any, customPermissions);
  const hasAccess = (role === 'admin' || role === 'super_admin') && permissions.analytics;

  return { hasAccess, userId: user.id, role, permissions };
}

export default async function AdminAnalyticsOverviewPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const { hasAccess, userId, role, permissions } = await checkAdminAccess();

  if (!hasAccess || !userId || !permissions) {
    redirect('/forbidden');
  }

  // 🎛️ Extract micro-permissions for analytics features
  const canView = permissions.analytics_view ?? permissions.analytics;
  const canExport = permissions.analytics_export ?? false;
  const canViewDetailed = permissions.analytics_detailed ?? permissions.analytics;

  // Get period from URL or default to 30d
  const period = (searchParams.period as Period) || '30d';

  // Fetch lead generation summary
  const summary = await getCompanyLeadsSummary(userId, role as UserRole, period);

  // Convert period to GA4 date format
  const ga4DateMap: Record<Period, string> = {
    '7d': '7daysAgo',
    '30d': '30daysAgo',
    '90d': '90daysAgo',
    'all': '365daysAgo', // All time = last year for GA4
  };
  const ga4StartDate = ga4DateMap[period];

  // Convert period to Search Console date format (YYYY-MM-DD)
  const today = new Date();
  const scDateMap: Record<Period, { startDate: string; endDate: string }> = {
    '7d': {
      startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    '30d': {
      startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    '90d': {
      startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
    'all': {
      startDate: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    },
  };
  const { startDate: scStartDate, endDate: scEndDate } = scDateMap[period];

  // Fetch GA4 website metrics, Search Console data, and Core Web Vitals (parallel fetching for performance)
  const [ga4Metrics, ga4Sources, ga4Devices, scMetrics, scQueries, scPages, coreWebVitals] = await Promise.all([
    getTrafficMetrics(ga4StartDate, 'today'),
    getTrafficSources(ga4StartDate, 'today'),
    getDeviceCategories(ga4StartDate, 'today'),
    getSearchMetrics(scStartDate, scEndDate),
    getTopQueries(scStartDate, scEndDate),
    getTopPages(scStartDate, scEndDate),
    getCoreWebVitals('https://taxgeniuspro.tax'),
  ]);

  // Prepare export data
  const exportData = [
    {
      source: 'Tax Genius',
      clicks: summary.taxGeniusLeads.clicks,
      leads: summary.taxGeniusLeads.leads,
      conversions: summary.taxGeniusLeads.conversions,
      returnsFiled: summary.taxGeniusLeads.returnsFiled,
      conversionRate: summary.taxGeniusLeads.conversionRate,
      revenue: summary.taxGeniusLeads.revenue,
      growthRate: summary.taxGeniusLeads.growthRate,
    },
    {
      source: 'Tax Preparers',
      clicks: summary.taxPreparerLeads.clicks,
      leads: summary.taxPreparerLeads.leads,
      conversions: summary.taxPreparerLeads.conversions,
      returnsFiled: summary.taxPreparerLeads.returnsFiled,
      conversionRate: summary.taxPreparerLeads.conversionRate,
      revenue: summary.taxPreparerLeads.revenue,
      growthRate: summary.taxPreparerLeads.growthRate,
    },
    {
      source: 'Affiliates',
      clicks: summary.affiliateLeads.clicks,
      leads: summary.affiliateLeads.leads,
      conversions: summary.affiliateLeads.conversions,
      returnsFiled: summary.affiliateLeads.returnsFiled,
      conversionRate: summary.affiliateLeads.conversionRate,
      revenue: summary.affiliateLeads.revenue,
      growthRate: summary.affiliateLeads.growthRate,
    },
    {
      source: 'Client Referrals',
      clicks: summary.clientReferrals.clicks,
      leads: summary.clientReferrals.leads,
      conversions: summary.clientReferrals.conversions,
      returnsFiled: summary.clientReferrals.returnsFiled,
      conversionRate: summary.clientReferrals.conversionRate,
      revenue: summary.clientReferrals.revenue,
      growthRate: summary.clientReferrals.growthRate,
    },
  ];

  // Calculate totals
  const totalClicks = exportData.reduce((sum, s) => sum + s.clicks, 0);
  const totalLeads = exportData.reduce((sum, s) => sum + s.leads, 0);
  const totalConversions = exportData.reduce((sum, s) => sum + s.conversions, 0);
  const totalReturnsFiled = exportData.reduce((sum, s) => sum + s.returnsFiled, 0);
  const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

  // Create funnel data for overall conversion
  const funnelStages = createFunnelStages(
    totalClicks,
    totalLeads,
    totalConversions,
    totalReturnsFiled
  );

  // Create source breakdown data
  const sourceBreakdown = createSourceBreakdown(
    summary.taxGeniusLeads.leads,
    summary.taxPreparerLeads.leads,
    summary.affiliateLeads.leads,
    summary.clientReferrals.leads
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Generation Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Company-wide lead tracking across all sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AnalyticsPeriodSelector currentPeriod={period} />
          {canExport && (
            <ExportButton data={exportData} filename="lead-analytics-overview" variant="default" />
          )}
        </div>
      </div>

      {/* Overall Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Total Clicks"
          value={totalClicks}
          growthRate={
            (summary.taxGeniusLeads.growthRate +
              summary.taxPreparerLeads.growthRate +
              summary.affiliateLeads.growthRate +
              summary.clientReferrals.growthRate) /
            4
          }
          icon="mouse-pointer-click"
          color="blue"
          format="number"
          subtitle={`${period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : period === '90d' ? 'Last 90 days' : 'All time'}`}
        />
        <LeadMetricCard
          title="Total Leads"
          value={totalLeads}
          icon="user-plus"
          color="purple"
          format="number"
        />
        <LeadMetricCard
          title="Conversions"
          value={totalConversions}
          icon="file-check"
          color="green"
          format="number"
        />
        <LeadMetricCard
          title="Total Revenue"
          value={summary.totalRevenue}
          icon="dollar-sign"
          color="yellow"
          format="currency"
        />
      </div>

      {/* Source Performance Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Performance by Source</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Tax Genius Leads */}
          <LeadMetricCard
            title="Tax Genius Leads"
            value={summary.taxGeniusLeads.leads}
            growthRate={summary.taxGeniusLeads.growthRate}
            icon="zap"
            color="blue"
            format="number"
            subtitle={`${summary.taxGeniusLeads.conversionRate.toFixed(1)}% conversion`}
          />

          {/* Tax Preparer Leads */}
          <LeadMetricCard
            title="Tax Preparer Leads"
            value={summary.taxPreparerLeads.leads}
            growthRate={summary.taxPreparerLeads.growthRate}
            icon="users"
            color="purple"
            format="number"
            subtitle={`${summary.taxPreparerLeads.conversionRate.toFixed(1)}% conversion`}
          />

          {/* Affiliate Leads */}
          <LeadMetricCard
            title="Affiliate Leads"
            value={summary.affiliateLeads.leads}
            growthRate={summary.affiliateLeads.growthRate}
            icon="target"
            color="orange"
            format="number"
            subtitle={`${summary.affiliateLeads.conversionRate.toFixed(1)}% conversion`}
          />

          {/* Client Referral Leads */}
          <LeadMetricCard
            title="Client Referrals"
            value={summary.clientReferrals.leads}
            growthRate={summary.clientReferrals.growthRate}
            icon="trending-up"
            color="green"
            format="number"
            subtitle={`${summary.clientReferrals.conversionRate.toFixed(1)}% conversion`}
          />
        </div>
      </div>

      {/* Revenue by Source Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Revenue by Source</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <LeadMetricCard
            title="Tax Genius Revenue"
            value={summary.taxGeniusLeads.revenue}
            icon="dollar-sign"
            color="blue"
            format="currency"
            subtitle={`${summary.taxGeniusLeads.returnsFiled} returns filed`}
          />
          <LeadMetricCard
            title="Tax Preparer Revenue"
            value={summary.taxPreparerLeads.revenue}
            icon="dollar-sign"
            color="purple"
            format="currency"
            subtitle={`${summary.taxPreparerLeads.returnsFiled} returns filed`}
          />
          <LeadMetricCard
            title="Affiliate Revenue"
            value={summary.affiliateLeads.revenue}
            icon="dollar-sign"
            color="orange"
            format="currency"
            subtitle={`${summary.affiliateLeads.returnsFiled} returns filed`}
          />
          <LeadMetricCard
            title="Referral Revenue"
            value={summary.clientReferrals.revenue}
            icon="dollar-sign"
            color="green"
            format="currency"
            subtitle={`${summary.clientReferrals.returnsFiled} returns filed`}
          />
        </div>
      </div>

      {/* Google Analytics 4 Website Performance Section */}
      <GA4MetricsCard metrics={ga4Metrics} />

      {/* GA4 Charts Row - Traffic Sources & Device Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TrafficSourcesChart sources={ga4Sources} />
        <DeviceCategoryChart devices={ga4Devices} />
      </div>

      {/* Google Search Console SEO Performance Section */}
      <SearchMetricsCard metrics={scMetrics} />

      {/* Search Console Charts Row - Top Queries & Top Pages */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopQueriesChart queries={scQueries} />
        <TopPagesChart pages={scPages} />
      </div>

      {/* Core Web Vitals Section */}
      <CoreWebVitalsCard vitals={coreWebVitals} />

      {/* Lead Generation Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Funnel */}
        <ConversionFunnelChart
          stages={funnelStages}
          title="Overall Conversion Funnel"
          subtitle="Aggregate performance across all lead sources"
        />

        {/* Source Breakdown */}
        <SourceBreakdownChart
          data={sourceBreakdown}
          title="Leads by Source"
          subtitle="Distribution of leads across channels"
        />
      </div>

      {/* Quick Links to Detailed Pages */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/analytics/preparers"
          className="block p-6 border rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Tax Preparer Analytics</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View individual preparer performance and filter by specific preparers
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
            Track affiliate campaign performance and earnings
          </p>
        </Link>

        <Link
          href="/admin/analytics/clients"
          className="block p-6 border rounded-lg hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold">Client Referral Analytics</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor client referral programs and rewards
          </p>
        </Link>
      </div>
    </div>
  );
}
