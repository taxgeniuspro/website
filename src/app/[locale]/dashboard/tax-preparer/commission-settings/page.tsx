import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  DollarSign,
  Users,
  TrendingUp,
  Info,
  Star,
} from 'lucide-react';
import {
  getPreparerCommissionSettings,
  getPreparerReferrersWithRates,
} from '@/lib/services/tiered-commission.service';
import { CommissionSettingsForm } from '@/components/commission/CommissionSettingsForm';
import { ReferrerRatesTable } from '@/components/commission/ReferrerRatesTable';

export const metadata = {
  title: 'Commission Settings | Tax Genius Pro',
  description: 'Manage commission rates for your referrers',
};

async function isTaxPreparer() {
  const session = await auth();
  const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'tax_preparer' || role === 'admin';
}

export default async function CommissionSettingsPage() {
  const userIsPreparer = await isTaxPreparer();

  if (!userIsPreparer) {
    redirect('/forbidden');
  }

  const session = await auth();
  const preparerId = session?.user?.id;

  if (!preparerId) {
    redirect('/login');
  }

  // Get preparer's profile
  const profile = await prisma.profile.findUnique({
    where: { userId: preparerId },
    select: { id: true },
  });

  if (!profile) {
    redirect('/login');
  }

  // Get commission settings (now returns flexible tier structure)
  const settings = await getPreparerCommissionSettings(profile.id);

  // Get referrers with their rates
  const referrers = await getPreparerReferrersWithRates(profile.id);

  // Calculate stats
  const totalReferrers = referrers.length;
  const vipReferrers = referrers.filter(r => r.vipRate !== null).length;
  const totalPaidOut = referrers.reduce((sum, r) => sum + r.totalEarnings, 0);

  // Format tier display for info card
  const companyTiers = settings.companyDefaultTiers;
  const tierRatesDisplay = companyTiers.map(t => `$${t.rate}`).join('/');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Commission Settings
            </h1>
            <p className="text-muted-foreground">
              Configure commission rates for your referrers (clients & affiliates)
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Referrers</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferrers}</div>
              <p className="text-xs text-muted-foreground">Bonded to you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">VIP Rates</CardTitle>
              <Star className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{vipReferrers}</div>
              <p className="text-xs text-muted-foreground">With custom rates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rate Mode</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {settings.useCompanyDefaults ? 'Company Default' : 'Custom Tiers'}
              </div>
              <p className="text-xs text-muted-foreground">Current setting</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
              <DollarSign className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalPaidOut.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">To all referrers</p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
              <Info className="w-5 h-5" />
              How Referrer Commissions Work
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 dark:text-blue-300 space-y-3">
            <p>
              When your referrers (clients or bonded affiliates) bring you new clients, they earn commissions based on this hierarchy:
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li><strong>VIP Rate</strong> - Individual rate you set for specific referrers (highest priority)</li>
              <li><strong>Your Custom Tiers</strong> - If you&apos;ve configured custom rates below</li>
              <li><strong>Company Default Tiers</strong> - Tax Genius standard rates ({tierRatesDisplay})</li>
            </ol>
            <p className="text-sm mt-4">
              <strong>Important:</strong> Commission is credited when you mark the referral as COMPLETE after filing their return.
            </p>
          </CardContent>
        </Card>

        {/* Commission Tier Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Commission Tier Settings
            </CardTitle>
            <CardDescription>
              Choose whether to use Tax Genius company default rates or configure your own custom tiers (up to 5)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CommissionSettingsForm
              initialSettings={{
                useCompanyDefaults: settings.useCompanyDefaults,
                customTierStructure: settings.customTierStructure,
              }}
              companyDefaultTiers={settings.companyDefaultTiers}
            />
          </CardContent>
        </Card>

        {/* Company Default Tiers Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tax Genius Company Default Tiers
            </CardTitle>
            <CardDescription>
              These are the built-in commission rates when using company defaults
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${companyTiers.length <= 3 ? 'sm:grid-cols-3' : companyTiers.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'}`}>
              {companyTiers.map((tier, index) => {
                const tierMin = index === 0 ? 1 : (companyTiers[index - 1].max ?? 0) + 1;
                const tierMax = tier.max === null ? '+' : tier.max;
                const colors = [
                  { badge: 'bg-amber-100 text-amber-800', text: 'text-amber-600' },
                  { badge: 'bg-slate-100 text-slate-800', text: 'text-slate-600' },
                  { badge: 'bg-yellow-100 text-yellow-800', text: 'text-yellow-600' },
                  { badge: 'bg-emerald-100 text-emerald-800', text: 'text-emerald-600' },
                  { badge: 'bg-purple-100 text-purple-800', text: 'text-purple-600' },
                ];
                const color = colors[index % colors.length];

                return (
                  <div key={index} className="p-4 border rounded-lg text-center">
                    <Badge className={`mb-2 ${color.badge}`}>Tier {index + 1}</Badge>
                    <p className={`text-2xl font-bold ${color.text}`}>${tier.rate}</p>
                    <p className="text-sm text-muted-foreground">
                      Referrals {tierMin}-{tierMax}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Referrer Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Referrers
            </CardTitle>
            <CardDescription>
              View and manage individual VIP rates for your referrers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {referrers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No referrers yet</p>
                <p className="text-sm mt-2">
                  When clients or affiliates bond with you, they&apos;ll appear here
                </p>
              </div>
            ) : (
              <ReferrerRatesTable referrers={referrers} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
