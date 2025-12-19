import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    select: { id: true },
  });

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
