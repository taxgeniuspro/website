import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getMyPreparerAnalytics } from '@/lib/services/lead-analytics.service';
import { TaxPreparerAnalyticsClient } from '@/components/analytics/TaxPreparerAnalyticsClient';

export const metadata = {
  title: 'My Lead Analytics | Tax Genius Pro',
  description: 'Track your lead generation performance',
};

async function checkPreparerAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null };

  const role = user?.role as string;
  const hasAccess = role === 'tax_preparer';

  return { hasAccess, userId: user.id };
}

export default async function TaxPreparerAnalyticsPage() {
  const { hasAccess, userId } = await checkPreparerAccess();

  if (!hasAccess || !userId) {
    redirect('/forbidden');
  }

  // Fetch my analytics - ONLY my data
  const myData = await getMyPreparerAnalytics(userId);

  return <TaxPreparerAnalyticsClient data={myData} />;
}
