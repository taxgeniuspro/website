import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { MobileHubClient } from '@/components/mobile-hub/MobileHubClient';
import { getUserPermissions, UserRole } from '@/lib/permissions';

export const metadata = {
  title: 'My Hub | TaxGeniusPro',
  description: 'Your mobile command center',
};

export default async function MobileHubPage() {
  const session = await auth(); const user = session?.user;

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/auth/signin?redirect=/mobile-hub');
  }

  // Get user role
  const role = (user?.role as UserRole) || 'client';
  const permissions = getUserPermissions(role, user?.permissions as any);

  // Parse name into firstName and lastName
  const nameParts = user.name?.split(' ') || [];
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Get user profile data
  const userProfile = {
    id: user.id,
    firstName,
    lastName,
    email: user.email || '',
    imageUrl: user.image || undefined,
    role,
  };

  return <MobileHubClient user={userProfile} permissions={permissions} />;
}
