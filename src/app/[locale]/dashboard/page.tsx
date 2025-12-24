import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { UserRole } from '@/lib/permissions';
import { ROLE_DASHBOARD_ROUTES } from '@/lib/navigation-items';

/**
 * /dashboard route - Redirects to role-specific dashboard
 *
 * This page exists solely to handle sign-in redirects.
 * Based on user role, redirects to appropriate dashboard:
 * - admin → /dashboard/admin
 * - tax_preparer → /dashboard/tax-preparer
 * - client → /dashboard/client
 * - affiliate → /dashboard/affiliate/analytics (marketing-focused)
 */
export default async function DashboardRedirect() {
  const session = await auth(); const user = session?.user;

  if (!user) {
    redirect('/auth/signin');
  }

  // Get user role from metadata
  const role = (user?.role as UserRole) || 'client';

  // Use centralized role dashboard routes
  const targetUrl = ROLE_DASHBOARD_ROUTES[role] || '/dashboard/client';
  redirect(targetUrl);
}
