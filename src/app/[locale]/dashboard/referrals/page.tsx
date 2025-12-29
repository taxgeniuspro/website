import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getUserPermissions, type UserPermissions, type UserRole } from '@/lib/permissions';
import { UnifiedReferralsPage } from '@/components/dashboard/UnifiedReferralsPage';

export const metadata = {
  title: 'Referrals | Tax Genius Pro',
  description: 'Manage your referral links, QR codes, and track your earnings',
};

async function checkAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, profileId: null, role: null, permissions: null };

  const role = user?.role as UserRole;
  const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
  const permissions = getUserPermissions(role, customPermissions);

  // All roles can access referrals (with appropriate data scoping)
  const hasAccess = role === 'tax_preparer' || role === 'admin' || role === 'client';

  // Get profile and additional data
  let profileId = null;
  let affiliateStatus = null;
  if (hasAccess && user.id) {
    const { data: profiles } = await db
      .from('profiles')
      .select('id, affiliateStatus, trackingCode, customTrackingCode, trackingCodeFinalized')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profiles);
    profileId = profile?.id || null;
    affiliateStatus = profile?.affiliateStatus || null;
  }

  return { hasAccess, userId: user.id, profileId, role, permissions, affiliateStatus };
}

export default async function ReferralsPage() {
  const { hasAccess, userId, profileId, role, permissions, affiliateStatus } = await checkAccess();

  if (!hasAccess || !userId || !profileId || !permissions) {
    redirect('/forbidden');
  }

  // Extract micro-permissions
  const canEdit = permissions.tracking_edit ?? false;
  const canViewAnalytics = permissions.tracking_analytics ?? permissions.trackingCode;

  return (
    <UnifiedReferralsPage
      userId={userId}
      profileId={profileId}
      role={role as 'tax_preparer' | 'admin' | 'client'}
      canEdit={canEdit}
      canViewAnalytics={canViewAnalytics}
      affiliateStatus={affiliateStatus}
    />
  );
}
