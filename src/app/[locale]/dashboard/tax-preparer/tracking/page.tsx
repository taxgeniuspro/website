import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserPermissions, type UserPermissions } from '@/lib/permissions';
import { TrackingCodeDashboard } from '@/components/tracking/TrackingCodeDashboard';

export const metadata = {
  title: 'My Tracking Code | Tax Genius Pro',
  description: 'Manage your universal tracking code and view performance',
};

async function checkPreparerAccess() {
  const session = await auth(); const user = session?.user;
  if (!user) return { hasAccess: false, userId: null, profileId: null, permissions: null };

  const role = user?.role as string;
  const customPermissions = user?.permissions as Partial<UserPermissions> | undefined;
  const permissions = getUserPermissions(role as any, customPermissions);

  // Allow tax_preparer, admin, and super_admin to access tracking
  const hasAccess = (role === 'tax_preparer' || role === 'admin' || role === 'super_admin' || role === 'affiliate' || role === 'client') && permissions.trackingCode;

  // Get profile ID
  let profileId = null;
  if (hasAccess && user.id) {
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    profileId = profile?.id || null;
  }

  return { hasAccess, userId: user.id, profileId, permissions };
}

export default async function TaxPreparerTrackingPage() {
  const { hasAccess, userId, profileId, permissions } = await checkPreparerAccess();

  if (!hasAccess || !userId || !profileId || !permissions) {
    redirect('/forbidden');
  }

  // 🎛️ Extract micro-permissions for tracking features
  const canView = permissions.tracking_view ?? permissions.trackingCode;
  const canEdit = permissions.tracking_edit ?? false;
  const canViewAnalytics = permissions.tracking_analytics ?? permissions.trackingCode;

  return (
    <TrackingCodeDashboard
      userId={userId}
      profileId={profileId}
      role="tax_preparer"
      canEdit={canEdit}
      canViewAnalytics={canViewAnalytics}
    />
  );
}
