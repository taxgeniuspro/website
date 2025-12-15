import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { BookingSettingsClient } from '@/components/admin/BookingSettingsClient';

export default async function BookingSettingsPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect('/auth/signin');

  // Only admins can access booking settings
  if (user.role !== 'admin') {
    redirect('/forbidden');
  }

  return <BookingSettingsClient />;
}
