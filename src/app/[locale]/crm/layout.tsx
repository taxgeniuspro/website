import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { CRMLayoutClient } from '@/components/CRMLayoutClient';
import { getUserPermissions, UserRole, UserPermissions } from '@/lib/permissions';

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  // Get real authenticated user from Clerk
  const session = await auth(); const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin');
  }

  // Get real role from user's public metadata
  const role = user?.role as string | undefined;

  // Redirect users without CRM access (allow admin, super_admin, tax_preparer)
  if (role !== 'admin' && role !== 'super_admin' && role !== 'tax_preparer') {
    redirect('/forbidden');
  }

  // Cast role to proper type for sidebar
  const sidebarRole = role as UserRole;

  // Get user permissions (custom or default based on role)
  const customPermissions = user?.permissions as
    | Partial<UserPermissions>
    | undefined;
  const permissions = getUserPermissions(sidebarRole, customPermissions);

  return (
    <CRMLayoutClient role={sidebarRole} permissions={permissions}>
      {children}
    </CRMLayoutClient>
  );
}
