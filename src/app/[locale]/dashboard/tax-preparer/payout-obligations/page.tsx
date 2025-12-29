/**
 * Tax Preparer Payout Obligations Page
 *
 * Shows what the Tax Preparer owes to their referrers (clients + bonded affiliates)
 * Tax Preparers do NOT earn commissions - they manage and pay them to referrers
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { PayoutObligationsClient } from './payout-obligations-client';

export const metadata = {
  title: 'Payout Obligations | Tax Genius Pro',
  description: 'Manage commission payouts to your referrers',
};

interface PreparerProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

async function getPreparerData() {
  const session = await auth();
  const user = session?.user;

  if (!user) return null;

  const role = user?.role;
  if (role !== 'tax_preparer' && role !== 'admin') return null;

  const { data: profileData } = await db
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('user_id', user.id)
    .limit(1);

  const profile = firstOrNull<PreparerProfile>(profileData);
  if (!profile) return null;

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
  };
}

export default async function PayoutObligationsPage() {
  const preparer = await getPreparerData();

  if (!preparer) {
    redirect('/forbidden');
  }

  return <PayoutObligationsClient preparerId={preparer.id} />;
}
