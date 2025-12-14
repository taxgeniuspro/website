/**
 * Tax Preparer Payout Obligations Page
 *
 * Shows what the Tax Preparer owes to their referrers (clients + bonded affiliates)
 * Tax Preparers do NOT earn commissions - they manage and pay them to referrers
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PayoutObligationsClient } from './payout-obligations-client';

export const metadata = {
  title: 'Payout Obligations | Tax Genius Pro',
  description: 'Manage commission payouts to your referrers',
};

async function getPreparerData() {
  const session = await auth();
  const user = session?.user;

  if (!user) return null;

  const role = user?.role;
  if (role !== 'tax_preparer' && role !== 'admin') return null;

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { id: true, firstName: true, lastName: true },
  });

  return profile;
}

export default async function PayoutObligationsPage() {
  const preparer = await getPreparerData();

  if (!preparer) {
    redirect('/forbidden');
  }

  return <PayoutObligationsClient preparerId={preparer.id} />;
}
