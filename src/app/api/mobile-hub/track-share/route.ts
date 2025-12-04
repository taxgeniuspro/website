/**
 * Mobile Hub Track Share API
 *
 * POST /api/mobile-hub/track-share - Track when a user shares a link
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trackingId, method, url } = body;

    if (!trackingId || !method || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user role from Clerk or default to client
    const userRole = 'tax_preparer'; // TODO: Get from actual user metadata

    // Determine link type from tracking ID
    const linkType = trackingId.split('-')[0]; // e.g., "intake-userId" -> "intake"

    // Create share record
    await prisma.mobileHubShare.create({
      data: {
        userId: userId,
        userRole,
        linkType,
        linkUrl: url,
        trackingId,
        shareMethod: method,
      },
    });

    // Increment share count in stats
    await prisma.mobileHubStats.upsert({
      where: { userId: userId },
      create: {
        userId: userId,
        userRole,
        linkShares: 1,
      },
      update: {
        linkShares: { increment: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Share tracked successfully',
    });
  } catch (error) {
    logger.error('Error tracking share:', error);
    return NextResponse.json({ error: 'Failed to track share' }, { status: 500 });
  }
}
