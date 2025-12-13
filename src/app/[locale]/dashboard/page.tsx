import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/permissions';

/**
 * /dashboard route - Redirects to role-specific dashboard
 *
 * This page exists solely to handle Clerk's afterSignIn/afterSignUp redirects.
 * The middleware (middleware.ts lines 309-325) will redirect users to their
 * role-specific dashboard, but Next.js requires an actual page to exist first.
 */
export default async function DashboardRedirect() {
  const session = await auth(); const user = session?.user;

  if (!user) {
    redirect('/auth/signin');
  }

  // Get user role from metadata
  const role = (user?.role as UserRole) || 'client';

  // Redirect to role-specific dashboard
  // Valid roles: admin, tax_preparer, client (3 roles only)
  const dashboardUrls: Record<string, string> = {
    admin: '/dashboard/admin',
    client: '/dashboard/client',
    tax_preparer: '/dashboard/tax-preparer',
  };

  const targetUrl = dashboardUrls[role] || '/dashboard/client';
  redirect(targetUrl);
}
