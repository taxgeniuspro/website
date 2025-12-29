import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// TypeScript interfaces for Supabase data
interface BondedAffiliate {
  id: string;
  bondedAt: string;
  isActive: boolean;
  commissionStructure: unknown;
  affiliate: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    customTrackingCode: string | null;
    user: { email: string };
  };
}
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  DollarSign,
  TrendingUp,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Link as LinkIcon,
  Settings,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Bonded Affiliates - Tax Genius Pro',
  description: 'Manage your bonded affiliates and their referrals',
};

async function isTaxPreparer() {
  const session = await auth();
  const user = session?.user;
  if (!user) return false;
  const role = user?.role as string;
  return role === 'tax_preparer' ;
}

export default async function BondedAffiliatesPage() {
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
  const { data: profiles } = await db
    .from('profiles')
    .select('*')
    .eq('userId', preparerId)
    .limit(1);

  const profile = firstOrNull(profiles);

  if (!profile) {
    redirect('/login');
  }

  // Get bonded affiliates with their stats
  const { data: bondedAffiliatesData } = await db
    .from('affiliate_bondings')
    .select(`
      id,
      bondedAt,
      isActive,
      commissionStructure,
      affiliate:profiles!affiliate_bondings_affiliateId_fkey(
        id,
        firstName,
        lastName,
        phone,
        customTrackingCode,
        user:users!profiles_userId_fkey(email)
      )
    `)
    .eq('preparerId', profile.id)
    .eq('isActive', true)
    .order('bondedAt', { ascending: false });

  // Transform data to match expected structure
  const bondedAffiliates: BondedAffiliate[] = (bondedAffiliatesData || []).map((item: Record<string, unknown>) => {
    const affiliateData = item.affiliate as {
      id: string;
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      customTrackingCode: string | null;
      user: { email: string };
    };
    return {
      id: item.id as string,
      bondedAt: item.bondedAt as string,
      isActive: item.isActive as boolean,
      commissionStructure: item.commissionStructure,
      affiliate: affiliateData,
    };
  });

  // Get referral stats for each bonded affiliate
  const affiliateStats = await Promise.all(
    bondedAffiliates.map(async (bonding) => {
      // Count total referrals
      const { count: totalReferrals } = await db
        .from('tax_intake_leads')
        .select('*', { count: 'exact', head: true })
        .eq('taxPreparerId', profile.id)
        .eq('referrerCode', bonding.affiliate.customTrackingCode || '');

      // Count converted referrals
      const { count: convertedReferrals } = await db
        .from('tax_intake_leads')
        .select('*', { count: 'exact', head: true })
        .eq('taxPreparerId', profile.id)
        .eq('referrerCode', bonding.affiliate.customTrackingCode || '')
        .in('status', ['CONVERTED', 'FILED']);

      // Get total commissions
      const { data: commissionsData } = await db
        .from('commissions')
        .select('amount')
        .eq('profileId', bonding.affiliate.id)
        .eq('status', 'PAID');

      const totalEarnings = (commissionsData || []).reduce((sum: number, c: { amount: number }) => sum + Number(c.amount), 0);

      return {
        ...bonding,
        stats: {
          totalReferrals: totalReferrals || 0,
          convertedReferrals: convertedReferrals || 0,
          totalEarnings,
        },
      };
    })
  );

  // Calculate totals
  const totalBondedAffiliates = bondedAffiliates.length;
  const totalReferralsFromAffiliates = affiliateStats.reduce(
    (sum, a) => sum + a.stats.totalReferrals, 0
  );
  const totalConversionsFromAffiliates = affiliateStats.reduce(
    (sum, a) => sum + a.stats.convertedReferrals, 0
  );
  const totalEarningsPaidToAffiliates = affiliateStats.reduce(
    (sum, a) => sum + a.stats.totalEarnings, 0
  );

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCommissionDisplay = (commissionStructure: unknown) => {
    if (!commissionStructure) return 'Default rate';
    const structure = commissionStructure as Record<string, { count?: number; rate?: number }>;
    if (structure.tier1?.rate) {
      return `${structure.tier1.rate}% base`;
    }
    return 'Custom tiered';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bonded Affiliates</h1>
            <p className="text-muted-foreground">
              Affiliates who promote your services and earn commissions on referrals
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/tax-preparer/referrals">
                <Users className="w-4 h-4 mr-2" />
                All Referrals
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/tax-preparer/settings">
                <Settings className="w-4 h-4 mr-2" />
                Commission Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Bonded Affiliates</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBondedAffiliates}</div>
              <p className="text-xs text-muted-foreground">Partners promoting you</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <UserPlus className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReferralsFromAffiliates}</div>
              <p className="text-xs text-muted-foreground">From bonded affiliates</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {totalConversionsFromAffiliates}
              </div>
              <p className="text-xs text-muted-foreground">Returns filed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Paid to Affiliates</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalEarningsPaidToAffiliates.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">All-time commissions</p>
            </CardContent>
          </Card>
        </div>

        {/* How Bonding Works */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <LinkIcon className="w-5 h-5" />
              How Affiliate Bonding Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <p>
              <strong>Bonded affiliates</strong> are partners who promote your tax preparation services.
              When they refer clients who complete tax returns with you:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Affiliates earn commissions based on your configured rates</li>
              <li>You can set custom tiered commission structures per affiliate</li>
              <li>Referrals are tracked via their unique tracking codes</li>
              <li>Both you and the affiliate benefit from successful referrals</li>
            </ul>
          </CardContent>
        </Card>

        {/* Bonded Affiliates List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Bonded Affiliates</CardTitle>
            <CardDescription>
              Partners who are actively promoting your services
            </CardDescription>
          </CardHeader>
          <CardContent>
            {affiliateStats.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No bonded affiliates yet</p>
                <p className="text-sm mt-2">
                  When affiliates bond with you, they&apos;ll appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {affiliateStats.map((bonding) => (
                  <div
                    key={bonding.id}
                    className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {bonding.affiliate.firstName?.[0] || bonding.affiliate.user.email[0].toUpperCase()}
                        {bonding.affiliate.lastName?.[0] || ''}
                      </div>
                      <div>
                        <p className="font-medium">
                          {bonding.affiliate.firstName && bonding.affiliate.lastName
                            ? `${bonding.affiliate.firstName} ${bonding.affiliate.lastName}`
                            : bonding.affiliate.user.email}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {bonding.affiliate.user.email}
                          </span>
                          {bonding.affiliate.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {bonding.affiliate.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="w-3 h-3 mr-1" />
                            Bonded {formatDate(bonding.bondedAt)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getCommissionDisplay(bonding.commissionStructure)}
                          </Badge>
                          {bonding.affiliate.customTrackingCode && (
                            <Badge variant="outline" className="text-xs">
                              Code: {bonding.affiliate.customTrackingCode}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 lg:gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{bonding.stats.totalReferrals}</p>
                        <p className="text-xs text-muted-foreground">Referrals</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {bonding.stats.convertedReferrals}
                        </p>
                        <p className="text-xs text-muted-foreground">Converted</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">
                          ${bonding.stats.totalEarnings.toFixed(0)}
                        </p>
                        <p className="text-xs text-muted-foreground">Earned</p>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/tax-preparer/referrals?affiliate=${bonding.affiliate.id}`}>
                          View
                          <ArrowUpRight className="w-4 h-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Structure Info */}
        <Card>
          <CardHeader>
            <CardTitle>Commission Structure</CardTitle>
            <CardDescription>
              How affiliate commissions are calculated
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-bronze-100 flex items-center justify-center text-orange-700">1</span>
                  Custom Rate
                </h4>
                <p className="text-sm text-muted-foreground">
                  If you&apos;ve set a custom commission structure for a specific affiliate, that rate applies first.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">2</span>
                  Bonding Agreement
                </h4>
                <p className="text-sm text-muted-foreground">
                  Rates defined in the bonding agreement between you and the affiliate take precedence over group rates.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">3</span>
                  Group / Default Rate
                </h4>
                <p className="text-sm text-muted-foreground">
                  If no custom or bonding rate exists, the affiliate&apos;s group rate or system default applies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
