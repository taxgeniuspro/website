/**
 * Unified Marketing Links API
 *
 * Single endpoint for all roles to get their marketing links.
 *
 * GET /api/marketing-links - Get or create links for current user
 * GET /api/marketing-links?profileId=xxx - Admin: Get links for specific profile
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  getOrCreateMarketingLinks,
  regenerateQRCodes,
} from '@/lib/services/marketing-links.service';

// Local TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  role: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Admin can query other profiles
    const searchParams = req.nextUrl.searchParams;
    let targetProfileId = profile.id;

    if (profile.role === 'admin' && searchParams.has('profileId')) {
      targetProfileId = searchParams.get('profileId')!;
      logger.info('Admin querying links for profile', { targetProfileId });
    }

    // Get or create marketing links
    const result = await getOrCreateMarketingLinks(targetProfileId);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in marketing-links API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing links' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketing-links - Regenerate QR codes
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { action, profileId } = body;

    // Get current user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', userId)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Determine target profile
    let targetProfileId = profile.id;
    if (profile.role === 'admin' && profileId) {
      targetProfileId = profileId;
    }

    if (action === 'regenerate-qr') {
      const success = await regenerateQRCodes(targetProfileId);
      if (success) {
        // Return updated links
        const result = await getOrCreateMarketingLinks(targetProfileId);
        return NextResponse.json({
          success: true,
          message: 'QR codes regenerated successfully',
          ...result,
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to regenerate QR codes' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error('Error in marketing-links POST:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
