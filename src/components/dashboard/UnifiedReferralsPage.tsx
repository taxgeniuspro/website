'use client';

/**
 * Unified Referrals Page Component
 *
 * Consolidates all referral-related functionality into a single page:
 * - Share & Earn info
 * - Referral links management (QR codes, short links)
 * - Tracking code dashboard
 * - Role-based content (client vs tax_preparer vs admin)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReferralLinksManager } from '@/components/dashboard/ReferralLinksManager';
import { TrackingCodeDashboard } from '@/components/tracking/TrackingCodeDashboard';
import {
  Share2,
  Gift,
  DollarSign,
  Users,
  TrendingUp,
  QrCode,
  Link as LinkIcon,
  BarChart3,
} from 'lucide-react';
// Affiliate status type (migrated from Prisma to local interface)
export type AffiliateStatus = 'INACTIVE' | 'PENDING' | 'ACTIVE' | 'SUSPENDED';

interface UnifiedReferralsPageProps {
  userId: string;
  profileId: string;
  role: 'tax_preparer' | 'admin' | 'client';
  canEdit?: boolean;
  canViewAnalytics?: boolean;
  affiliateStatus?: AffiliateStatus | null;
}

export function UnifiedReferralsPage({
  userId,
  profileId,
  role,
  canEdit = false,
  canViewAnalytics = true,
  affiliateStatus,
}: UnifiedReferralsPageProps) {
  const isTaxPreparer = role === 'tax_preparer';
  const isAdmin = role === 'admin';
  const isClient = role === 'client';

  // Role-specific content
  const roleContent = {
    tax_preparer: {
      title: 'Referrals & Marketing',
      subtitle: 'Manage your referral links, QR codes, and track your performance',
      earnLabel: 'Earn Commissions',
      earnDescription: 'Get paid when your referrals complete their tax filing',
    },
    admin: {
      title: 'Platform Referrals',
      subtitle: 'View platform-wide referral performance and manage tracking codes',
      earnLabel: 'Track Earnings',
      earnDescription: 'Monitor platform-wide referral commissions and payouts',
    },
    client: {
      title: 'Share & Earn',
      subtitle: 'Refer friends and family to earn rewards',
      earnLabel: 'Earn Rewards',
      earnDescription: 'Get rewarded when your referrals complete their tax filing',
    },
  };

  const content = roleContent[role] || roleContent.client;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Share2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{content.title}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {content.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* How It Works - Show for all roles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            How It Works
          </CardTitle>
          <CardDescription>
            {isTaxPreparer
              ? 'Earn commissions by referring clients to Tax Genius Pro'
              : 'Earn rewards by referring people to Tax Genius Pro'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">1. Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  {isTaxPreparer
                    ? 'Send your personalized referral link or QR code to potential clients'
                    : 'Send your personalized referral link to friends, family, or on social media'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/20">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">2. They Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  When someone clicks your link and starts their tax filing, you get credit
                </p>
              </div>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="p-3 rounded-full bg-orange-100 dark:bg-orange-900/20">
                <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold">3. {content.earnLabel}</h3>
                <p className="text-sm text-muted-foreground">
                  {content.earnDescription}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Tabs for different features */}
      <Tabs defaultValue="links" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="links" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">My Links</span>
            <span className="sm:hidden">Links</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR & Tracking</span>
            <span className="sm:hidden">QR</span>
          </TabsTrigger>
        </TabsList>

        {/* Links Tab - Uses ReferralLinksManager */}
        <TabsContent value="links" className="space-y-4">
          <ReferralLinksManager />
        </TabsContent>

        {/* Tracking Tab - Uses TrackingCodeDashboard */}
        <TabsContent value="tracking" className="space-y-4">
          <TrackingCodeDashboard
            userId={userId}
            profileId={profileId}
            role={role}
            canEdit={canEdit}
            canViewAnalytics={canViewAnalytics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
