import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { getUserPermissions, UserRole, UserPermissions } from '@/lib/permissions';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Get real authenticated user from Clerk
  const session = await auth(); const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin');
  }

  // Get real role from user's public metadata
  const role = user?.role as string | undefined;

  // Redirect non-admin users to forbidden page
  // STRICT: Only admin role can access /admin/* routes
  // Tax preparers have their own dashboard at /dashboard/tax-preparer
  if (role !== 'admin') {
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
    <AdminLayoutClient role={sidebarRole} permissions={permissions}>
      {children}
    </AdminLayoutClient>
  );
}
