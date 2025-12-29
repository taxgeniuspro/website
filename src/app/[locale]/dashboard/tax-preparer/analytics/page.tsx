import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { getMyPreparerAnalytics } from '@/lib/services/lead-analytics.service';
import { TaxPreparerAnalyticsClient } from '@/components/analytics/TaxPreparerAnalyticsClient';

export const metadata = {
  title: 'My Lead Analytics | Tax Genius Pro',
  description: 'Track your lead generation performance',
};

async function checkPreparerAccess() {
  const session = await auth();
  const user = session?.user;
  if (!user) return { hasAccess: false, preparerId: null };

  const role = user?.role as string;
  const hasAccess = role === 'tax_preparer';

  // Fetch profile to get Profile.id (not User.id)
  // Analytics queries filter by Profile.id, not User.id
  const { data: profiles } = await db
    .from('profiles')
    .select('id')
    .eq('userId', user.id)
    .limit(1);

  const profile = firstOrNull(profiles);
  return { hasAccess, preparerId: profile?.id || null };
}

export default async function TaxPreparerAnalyticsPage() {
  const { hasAccess, preparerId } = await checkPreparerAccess();

  if (!hasAccess || !preparerId) {
    redirect('/forbidden');
  }

  // Fetch my analytics - ONLY my data (using Profile.id)
  const myData = await getMyPreparerAnalytics(preparerId);

  return <TaxPreparerAnalyticsClient data={myData} />;
}
