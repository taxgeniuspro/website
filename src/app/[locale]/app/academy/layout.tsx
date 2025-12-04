import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayoutClient } from '@/components/DashboardLayoutClient';
import { getUserPermissions, UserRole, UserPermissions } from '@/lib/permissions';
import { getEffectiveRole } from '@/lib/utils/role-switcher';

export const metadata = {
  title: 'Tax Preparer Academy | Tax Genius Pro',
  description: 'Comprehensive tax preparation training videos and resources',
};

async function hasAcademyAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return false;

  const role = user?.role as string;

  // Tax preparers, admins, and super_admins have academy access
  return role === 'tax_preparer' || role === 'admin' || role === 'super_admin';
}

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const session = await auth(); const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin');
  }

  const hasAccess = await hasAcademyAccess();

  if (!hasAccess) {
    redirect('/forbidden');
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

  return (
    <DashboardLayoutClient
      actualRole={actualRole}
      effectiveRole={effectiveRole}
      isViewingAsOtherRole={isViewingAsOtherRole}
      viewingRoleName={viewingRoleName}
      permissions={permissions}
    >
      {children}
    </DashboardLayoutClient>
  );
}
