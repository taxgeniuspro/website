import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayoutClient } from '@/components/DashboardLayoutClient';
import { getUserPermissions, UserRole, UserPermissions } from '@/lib/permissions';
import { getEffectiveRole } from '@/lib/utils/role-switcher';
import { db, firstOrNull } from '@/lib/db';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Get real authenticated user from Clerk
  const session = await auth(); const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin');
  }

  // Get real role from user's public metadata
  const actualRole = (user?.role as UserRole) || 'client';

  // Get effective role (checks if admin is viewing as another role)
  const roleInfo = await getEffectiveRole(actualRole, user.id);
  const effectiveRole = roleInfo.effectiveRole;
  const isViewingAsOtherRole = roleInfo.isViewingAsOtherRole;
  const viewingRoleName = roleInfo.viewingRoleName;

  // Get user permissions based on effective role
  const customPermissions = user?.permissions as
    | Partial<UserPermissions>
    | undefined;
  const permissions = getUserPermissions(effectiveRole, customPermissions);

  // Fetch user profile for status-based access control (clients only)
  let affiliateStatus = null;
  let hasFiledTaxes = null;
  let hideReferralProgram = null;

  if (effectiveRole === 'client') {
    try {
      // Use OR conditions to match by supabaseUserId, userId, or email
      // This handles both legacy NextAuth users and new Supabase Auth users
      const { data: profiles, error } = await db
        .from('profiles')
        .select('affiliateStatus, hasFiledTaxes, hideReferralProgram')
        .or(`supabaseUserId.eq.${user.id},userId.eq.${user.id},email.eq.${user.email}`)
        .limit(1);

      if (error) {
        console.error('[Dashboard Layout] Failed to fetch profile:', error);
      }

      const profile = firstOrNull(profiles);
      if (profile) {
        affiliateStatus = profile.affiliateStatus;
        hasFiledTaxes = profile.hasFiledTaxes;
        hideReferralProgram = profile.hideReferralProgram;
      }
    } catch (error) {
      console.error('[Dashboard Layout] Failed to fetch profile:', error);
      // Continue with default values if profile fetch fails
    }
  }

  return (
    <DashboardLayoutClient
      actualRole={actualRole}
      effectiveRole={effectiveRole}
      isViewingAsOtherRole={isViewingAsOtherRole}
      viewingRoleName={viewingRoleName}
      permissions={permissions}
      affiliateStatus={affiliateStatus}
      hasFiledTaxes={hasFiledTaxes}
      hideReferralProgram={hideReferralProgram}
    >
      {children}
    </DashboardLayoutClient>
  );
}
