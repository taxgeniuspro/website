/**
 * Quick Share Links Dashboard - DEPRECATED for Admin
 *
 * This page has been removed from admin navigation.
 * Admins don't have personal tracking codes - they manage the company.
 * Tax preparers can access quick share at /dashboard/tax-preparer/tracking
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function QuickShareLinksPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect('/auth/signin');

  // Admin role - redirect to admin dashboard with message
  // Quick Share is a personal feature for tax preparers
  // Admins should use a separate tax preparer account for personal links
  redirect('/admin?notice=quick-share-removed');
}
