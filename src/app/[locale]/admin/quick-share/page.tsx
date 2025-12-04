/**
 * Quick Share Links Dashboard
 *
 * Allows users to create and manage trackable short links for:
 * - Tax Intake Forms
 * - Contact/Lead Forms
 * - Custom destinations
 *
 * Features:
 * - Create new short links
 * - View all links with analytics
 * - Edit/delete links
 * - Copy links & generate QR codes
 * - Real-time click tracking
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { QuickShareDashboard } from '@/components/links/QuickShareDashboard';

export default async function QuickShareLinksPage() {
  const session = await auth(); const user = session?.user;
  if (!user) redirect('/auth/signin');

  const role = user?.role as UserRole | undefined;
  const customPermissions = user?.permissions as any;
  const permissions = getUserPermissions(role || 'client', customPermissions);

  if (!permissions.quickShareLinks) redirect('/forbidden');

  return <QuickShareDashboard />;
}
