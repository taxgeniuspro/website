import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { QuickShareLanding } from '@/components/quick-share/QuickShareLanding';
import { UserRole } from '@/lib/permissions';

export const metadata = {
  title: 'Quick Share | TaxGeniusPro',
  description: 'Share your referral links quickly and easily',
};

export default async function QuickSharePage() {
  // Get authenticated user
  const session = await auth(); const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin');
  }

  // Get user's role
  const role = (user?.role as UserRole) || 'client';

  return <QuickShareLanding userId={user.id} role={role} firstName={user.firstName || undefined} />;
}
