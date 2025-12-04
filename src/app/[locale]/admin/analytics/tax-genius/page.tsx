import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  MousePointerClick,
  UserPlus,
  FileCheck,
  DollarSign,
  Link2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { LeadMetricCard } from '@/components/admin/analytics/LeadMetricCard';
import { createFunnelStages } from '@/lib/utils/analytics';
import { ConversionFunnelChart } from '@/components/admin/analytics/ConversionFunnelChart';
import { ExportButton } from '@/components/admin/analytics/ExportButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { logger } from '@/lib/logger';

export const metadata = {
  title: 'Tax Genius Analytics - Admin | Tax Genius Pro',
  description: 'Track company-owned lead generation campaigns',
};

async function checkAdminAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, role: null };

  const role = user?.role as string;
  const hasAccess = role === 'admin' || role === 'super_admin';

  return { hasAccess, userId: user.id, role };
}

export default async function TaxGeniusAnalyticsPage() {
  const { hasAccess, userId, role } = await checkAdminAccess();

  if (!hasAccess || !userId) {
    redirect('/forbidden');
  }

  // Initialize with empty defaults
  let companyLinks: any[] = [];
  let linkIds: string[] = [];
  let linkCodes: string[] = [];
  let totalClicks = 0;
  let totalLeads = 0;
  let totalConversions = 0;
  let totalReturnsFiled = 0;
  let totalRevenue = 0;
  let conversionRate = 0;
  let linkBreakdown: any[] = [];
  let recentLeads: any[] = [];

  try {
    // Get Tax Genius company marketing links
    companyLinks = await prisma.marketingLink.findMany({
      where: {
        creatorType: 'TAX_GENIUS',
      },
    });

    linkIds = companyLinks.map((l) => l.id);
    linkCodes = companyLinks.map((l) => l.code);

    // Get metrics
    totalClicks = await prisma.linkClick.count({
      where: { linkId: { in: linkIds } },
    });

    totalLeads = await prisma.lead.count({
      where: {
        OR: [{ source: { in: linkCodes } }, { assignedPreparerId: null }],
      },
    });

    totalConversions = await prisma.clientIntake.count({
      where: {
        OR: [{ sourceLink: { in: linkCodes } }, { assignedPreparerId: null }],
      },
    });

    totalReturnsFiled = await prisma.taxReturn.count({
      where: {
        profile: {
          clientIntakes: {
            some: {
              assignedPreparerId: null,
            },
          },
        },
      },
    });

    const revenueResult = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        profile: {
          clientIntakes: {
            some: {
              OR: [{ sourceLink: { in: linkCodes } }, { assignedPreparerId: null }],
            },
          },
        },
      },
      _sum: { amount: true },
    });

    totalRevenue = Number(revenueResult._sum.amount || 0);
    conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get link breakdown
    linkBreakdown = await Promise.all(
      companyLinks.map(async (link) => {
        const linkClicks = await prisma.linkClick.count({
          where: { linkId: link.id },
        });

        const linkLeads = await prisma.lead.count({
          where: { source: link.code },
        });

        const linkConversions = await prisma.clientIntake.count({
          where: { sourceLink: link.code },
        });

        const linkRevenue = await prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            profile: {
              clientIntakes: {
                some: { sourceLink: link.code },
              },
            },
          },
          _sum: { amount: true },
        });

        return {
          linkId: link.id,
          linkName: link.title || link.code,
          linkCode: link.code,
          linkUrl: `https://taxgeniuspro.tax/${link.code}`,
          clicks: linkClicks,
          leads: linkLeads,
          conversions: linkConversions,
          conversionRate: linkClicks > 0 ? (linkConversions / linkClicks) * 100 : 0,
          revenue: Number(linkRevenue._sum.amount || 0),
          createdAt: link.createdAt,
        };
      })
    );

    // Get recent leads
    recentLeads = await prisma.lead.findMany({
      where: {
        OR: [{ source: { in: linkCodes } }, { assignedPreparerId: null }],
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  } catch (error) {
    logger.error('Error fetching Tax Genius analytics:', error);
    // Continue with empty/zero defaults - will show "No company campaigns yet" message
  }

  // Create funnel data
  const funnelStages = createFunnelStages(
    totalClicks,
    totalLeads,
    totalConversions,
    totalReturnsFiled
  );

  // Prepare export data
  const exportData = {
    companyName: 'Tax Genius Pro',
    marketingLinksCount: companyLinks.length,
    clicks: totalClicks,
    leads: totalLeads,
    conversions: totalConversions,
    returnsFiled: totalReturnsFiled,
    conversionRate,
    revenue: totalRevenue,
    linkBreakdown: linkBreakdown.map((l) => ({
      linkName: l.linkName,
      linkCode: l.linkCode,
      clicks: l.clicks,
      leads: l.leads,
      conversions: l.conversions,
      conversionRate: l.conversionRate,
      revenue: l.revenue,
    })),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tax Genius Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Company-owned lead generation campaign performance
          </p>
        </div>
        <ExportButton data={[exportData]} filename="tax-genius-analytics" variant="default" />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <LeadMetricCard
          title="Marketing Links"
          value={companyLinks.length}
          icon="link-2"
          color="blue"
          format="number"
          subtitle="Active campaigns"
        />
        <LeadMetricCard
          title="Total Clicks"
          value={totalClicks}
          icon="mouse-pointer-click"
          color="purple"
          format="number"
        />
        <LeadMetricCard
          title="Leads Generated"
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
          title="Conversion Rate"
          value={conversionRate.toFixed(1)}
          icon="zap"
          color="purple"
          format="percent"
        />
        <LeadMetricCard
          title="Revenue per Lead"
          value={totalLeads > 0 ? totalRevenue / totalLeads : 0}
          icon="dollar-sign"
          color="orange"
          format="currency"
        />
      </div>

      {/* Conversion Funnel */}
      <ConversionFunnelChart
        stages={funnelStages}
        title="Company Conversion Funnel"
        subtitle="Tax Genius campaign performance breakdown"
      />

      {/* Marketing Link Performance */}
      {linkBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Marketing Link Performance</CardTitle>
            <CardDescription>
              Performance metrics for each company marketing campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {linkBreakdown.map((link) => (
                <div key={link.linkId} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium truncate">{link.linkName}</p>
                      <p className="text-xs text-muted-foreground truncate">{link.linkUrl}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold">{link.conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">conversion</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="text-center p-2 bg-blue-50 dark:bg-blue-950 rounded">
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {link.clicks}
                      </p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 dark:bg-purple-950 rounded">
                      <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                        {link.leads}
                      </p>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
                      <p className="text-xl font-bold text-green-700 dark:text-green-300">
                        {link.conversions}
                      </p>
                      <p className="text-xs text-muted-foreground">Conversions</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                      <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                        ${link.revenue.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                    </div>
                    <div className="text-center p-2 bg-orange-50 dark:bg-orange-950 rounded">
                      <p className="text-xl font-bold text-orange-700 dark:text-orange-300">
                        {link.conversionRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Leads */}
      {recentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest leads from Tax Genius campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{lead.email}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        {lead.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {companyLinks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Company Campaigns Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Create your first Tax Genius marketing campaign to start tracking company leads
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
