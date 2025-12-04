/**
 * Tracking Links API
 *
 * GET: Get all tracking-integrated links for current user
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET: Get all tracking-integrated links
 */
export async function GET() {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        trackingCode: true,
        customTrackingCode: true,
        trackingCodeFinalized: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get all marketing links created by this user
    const marketingLinks = await prisma.marketingLink.findMany({
      where: { creatorId: profile.id },
      select: {
        id: true,
        code: true,
        url: true,
        shortUrl: true,
        title: true,
        description: true,
        qrCodeImageUrl: true,
        targetPage: true,
        clicks: true,
        uniqueClicks: true,
        conversions: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const activeCode = profile.customTrackingCode || profile.trackingCode;

    return NextResponse.json({
      success: true,
      trackingCode: activeCode,
      isFinalized: profile.trackingCodeFinalized,
      links: marketingLinks,
    });
  } catch (error) {
    logger.error('Error fetching tracking links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
