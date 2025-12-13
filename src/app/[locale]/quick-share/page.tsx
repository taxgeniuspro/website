import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { ShareEarnPage } from '@/components/quick-share/ShareEarnPage';

export const metadata = {
  title: 'Share & Earn | TaxGeniusPro',
  description: 'Share your referral links and earn rewards',
};

export default async function QuickSharePage() {
  // Get authenticated user
  const session = await auth();
  const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin');
  }

  return <ShareEarnPage />;
}
