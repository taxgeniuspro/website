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
import { db, firstOrNull } from '@/lib/db';
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
  const { data: settingsData } = await db
    .from('system_settings')
    .select(`
      *,
      updated_by_profile:profiles!system_settings_updated_by_id_fkey(
        first_name,
        last_name,
        user_id
      )
    `)
    .eq('key', 'commission_default_tiers')
    .single();

  const setting = settingsData;
  const lastUpdatedBy = setting?.updated_by_profile
    ? `${setting.updated_by_profile.first_name || ''} ${setting.updated_by_profile.last_name || ''}`.trim() ||
      'Unknown'
    : null;
  const lastUpdatedAt = setting?.updated_at;

  // Count how many preparers are using company defaults
  const { count: preparersUsingDefaults } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'tax_preparer')
    .eq('use_company_commission_defaults', true);

  const { count: preparersUsingCustom } = await db
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'tax_preparer')
    .eq('use_company_commission_defaults', false);

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
              <Badge variant="default">{preparersUsingDefaults || 0}</Badge>
              <span className="text-muted-foreground">preparers using company defaults</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{preparersUsingCustom || 0}</Badge>
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
