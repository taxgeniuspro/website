import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CreativeType } from '@prisma/client';
import { getAccessibleCreatives } from '@/lib/services/creative.service';
import { hasAffiliateAccess } from '@/lib/permissions';

/**
 * GET /api/affiliate/creatives
 * Fetch creatives accessible to the current affiliate
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json({ error: 'Affiliate access required' }, { status: 403 });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as CreativeType | null;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getAccessibleCreatives(
      profile.id,
      {
        type: type || undefined,
        category,
        search,
      },
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch affiliate creatives', error);
    return NextResponse.json({ error: 'Failed to fetch creatives' }, { status: 500 });
  }
}
