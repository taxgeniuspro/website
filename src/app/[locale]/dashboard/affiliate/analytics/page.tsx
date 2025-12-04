'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  MousePointerClick,
  UserPlus,
  FileCheck,
  DollarSign,
  Link2,
  TrendingUp,
  Award,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { MetricsGrid } from '@/components/admin/analytics/MetricsGrid';
import { createFunnelStages } from '@/lib/utils/analytics';
import { ConversionFunnelChart } from '@/components/admin/analytics/ConversionFunnelChart';
import { ExportButton } from '@/components/admin/analytics/ExportButton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AffiliateAnalytics } from '@/lib/services/lead-analytics.service';

export default function AffiliateAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [myData, setMyData] = useState<AffiliateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return;

    // Check authentication and role
    if (!session?.user) {
      router.push('/auth/signin');
      return;
    }

    const role = session.user.role as string;
    if (role !== 'affiliate') {
      router.push('/forbidden');
      return;
    }

    // Fetch analytics data
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await fetch('/api/affiliate/analytics');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to load analytics' }));
          throw new Error(errorData.error || 'Failed to load analytics');
        }

        const data = await response.json();
        setMyData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [session, status, router]);

  // Loading state
  if (loading || status === 'loading') {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading your analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No data state
  if (!myData) {
    return (
      <div className="p-6 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Available</AlertTitle>
          <AlertDescription>Unable to load analytics data. Please try again later.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Create funnel data
  const funnelStages = createFunnelStages(
    myData.clicks,
    myData.leads,
    myData.conversions,
    myData.returnsFiled
  );

  // Prepare export data
  const exportData = {
    affiliateName: myData.affiliateName,
    affiliateEmail: myData.affiliateEmail,
    marketingLinksCount: myData.marketingLinksCount,
    clicks: myData.clicks,
    leads: myData.leads,
    conversions: myData.conversions,
    returnsFiled: myData.returnsFiled,
    conversionRate: myData.conversionRate,
    revenue: myData.revenue,
    commissionsEarned: myData.commissionsEarned,
    commissionsPending: myData.commissionsPending,
    lastActive: myData.lastActive?.toString() || 'Never',
    linkBreakdown: myData.linkBreakdown,
    recentLeads: myData.recentLeads,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Affiliate Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your affiliate performance, leads, and commissions
          </p>
        </div>
        <ExportButton data={[exportData]} filename="my-affiliate-analytics" variant="default" />
      </div>

      {/* Key Metrics */}
      <MetricsGrid
        metrics={[
          {
            title: 'Marketing Links',
            value: myData.marketingLinksCount,
            icon: Link2,
            color: 'blue',
            format: 'number',
            subtitle: 'Active campaigns',
          },
          {
            title: 'Total Clicks',
            value: myData.clicks,
            icon: MousePointerClick,
            color: 'purple',
            format: 'number',
          },
          {
            title: 'Leads Generated',
            value: myData.leads,
            icon: UserPlus,
            color: 'green',
            format: 'number',
          },
          {
            title: 'Total Revenue',
            value: myData.revenue,
            icon: DollarSign,
            color: 'yellow',
            format: 'currency',
          },
        ]}
      />

      {/* Commission Metrics */}
      <MetricsGrid
        metrics={[
          {
            title: 'Commissions Earned',
            value: myData.commissionsEarned,
            icon: Award,
            color: 'green',
            format: 'currency',
            subtitle: 'Paid out',
          },
          {
            title: 'Pending Commissions',
            value: myData.commissionsPending,
            icon: Clock,
            color: 'orange',
            format: 'currency',
            subtitle: 'Awaiting payment',
          },
          {
            title: 'Conversion Rate',
            value: myData.conversionRate.toFixed(1),
            icon: TrendingUp,
            color: 'purple',
            format: 'percent',
          },
          {
            title: 'Earnings per Lead',
            value: myData.leads > 0 ? myData.commissionsEarned / myData.leads : 0,
            icon: DollarSign,
            color: 'blue',
            format: 'currency',
          },
        ]}
      />

      {/* Conversion Funnel */}
      <ConversionFunnelChart
        stages={funnelStages}
        title="My Conversion Funnel"
        subtitle="Your affiliate campaign performance breakdown"
      />

      {/* Marketing Link Performance */}
      {myData.linkBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Performance metrics for each of your affiliate campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myData.linkBreakdown.map((link) => (
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
                        ${link.commission?.toLocaleString() || '0'}
                      </p>
                      <p className="text-xs text-muted-foreground">Commission</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Leads */}
      {myData.recentLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Your latest generated leads from affiliate campaigns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myData.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2">
                      {lead.status === 'CONVERTED' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                          ✓ Converted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {myData.marketingLinksCount === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full mx-auto flex items-center justify-center">
                <Link2 className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">No Affiliate Campaigns Yet</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Create your first affiliate campaign to start earning commissions
                </p>
              </div>
              <a
                href="/dashboard/affiliate/campaigns"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
              >
                Create Campaign
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
