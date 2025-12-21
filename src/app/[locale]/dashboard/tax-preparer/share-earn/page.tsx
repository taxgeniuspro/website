import { redirect } from 'next/navigation';

/**
 * Redirect to unified referrals page
 * This page has been consolidated into /dashboard/referrals
 */
export default function TaxPreparerShareEarnPage() {
  redirect('/dashboard/referrals');
}
