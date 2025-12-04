import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUserPermissions, UserRole } from '@/lib/permissions';
import { BookingSettingsClient } from '@/components/admin/BookingSettingsClient';

export default async function BookingSettingsPage() {
  const session = await auth(); const user = session?.user;
  if (!user) redirect('/auth/signin');

  const role = user?.role as UserRole | undefined;
  const permissions = getUserPermissions(role || 'client');

  // Only admins can access booking settings
  if (!['admin', 'full'].includes(permissions.users)) {
    redirect('/forbidden');
  }

  return <BookingSettingsClient />;
}
