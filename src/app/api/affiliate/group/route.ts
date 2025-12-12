import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/affiliate/group
 * Get the current affiliate's group information
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with group
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      include: {
        affiliateGroup: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is an affiliate
    const isAffiliate =
      profile.role === 'affiliate' ||
      profile.role === 'tax_preparer' ||
      profile.role === 'admin' ||
      profile.role === 'super_admin';

    if (!isAffiliate) {
      return NextResponse.json({ error: 'Not authorized as affiliate' }, { status: 403 });
    }

    if (!profile.affiliateGroup) {
      return NextResponse.json({
        group: null,
        message: 'Not assigned to any affiliate group',
      });
    }

    const group = profile.affiliateGroup;

    // Serialize group (convert Decimal to number)
    const serializedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      commissionType: group.commissionType,
      commissionRate: group.commissionRate?.toNumber() ?? null,
      flatAmount: group.flatAmount?.toNumber() ?? null,
      tieredRates: group.tieredRates,
      minimumPayout: group.minimumPayout.toNumber(),
      payoutFrequency: group.payoutFrequency,
      isActive: group.isActive,
    };

    return NextResponse.json({ group: serializedGroup });
  } catch (error) {
    logger.error('Failed to fetch affiliate group', error);
    return NextResponse.json({ error: 'Failed to fetch group' }, { status: 500 });
  }
}
