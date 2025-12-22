/**
 * Admin Commission Settings Page
 *
 * Allows administrators to configure company-wide default commission tiers.
 * These tiers are used when tax preparers choose "Use Company Defaults".
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Info } from 'lucide-react';
import { getCompanyDefaultTiers } from '@/lib/services/tiered-commission.service';
import { prisma } from '@/lib/prisma';
import { AdminCommissionSettingsForm } from './AdminCommissionSettingsForm';

export const metadata = {
  title: 'Commission Settings | Admin | Tax Genius Pro',
  description: 'Configure company-wide default commission tiers',
};

async function checkAdminAccess() {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return { hasAccess: false, user: null };

    const hasAccess = user.role === 'admin';
    return { hasAccess, user };
  } catch (error) {
    console.error('Auth check error:', error);
    return { hasAccess: false, user: null };
  }
}

export default async function AdminCommissionSettingsPage() {
  const { hasAccess, user } = await checkAdminAccess();

  if (!hasAccess || !user) {
    redirect('/forbidden');
  }

  // Get current company default tiers
  const companyDefaultTiers = await getCompanyDefaultTiers();

  // Get last update info
  const setting = await prisma.systemSettings.findUnique({
    where: { key: 'commission_default_tiers' },
    include: {
      updatedBy: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  const lastUpdatedBy = setting?.updatedBy
    ? `${setting.updatedBy.firstName || ''} ${setting.updatedBy.lastName || ''}`.trim() ||
      setting.updatedBy.user.email
    : null;
  const lastUpdatedAt = setting?.updatedAt;

  // Count how many preparers are using company defaults
  const preparersUsingDefaults = await prisma.profile.count({
    where: {
      role: 'tax_preparer',
      useCompanyCommissionDefaults: true,
    },
  });

  const preparersUsingCustom = await prisma.profile.count({
    where: {
      role: 'tax_preparer',
      useCompanyCommissionDefaults: false,
    },
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Commission Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure company-wide default commission tiers for the referral program
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-500" />
            <CardTitle>About Commission Tiers</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Commission tiers determine how much referrers earn per completed referral.
            Tax preparers can choose to use these company defaults or configure their own custom tiers.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="default">{preparersUsingDefaults}</Badge>
              <span className="text-muted-foreground">preparers using company defaults</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{preparersUsingCustom}</Badge>
              <span className="text-muted-foreground">preparers using custom tiers</span>
            </div>
          </div>
          {lastUpdatedBy && lastUpdatedAt && (
            <p className="text-xs text-muted-foreground">
              Last updated by {lastUpdatedBy} on {new Date(lastUpdatedAt).toLocaleDateString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <CardTitle>Company Default Tiers</CardTitle>
          </div>
          <CardDescription>
            Configure up to 5 commission tiers. Changes affect all tax preparers using company defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminCommissionSettingsForm
            initialTiers={companyDefaultTiers}
          />
        </CardContent>
      </Card>
    </div>
  );
}
