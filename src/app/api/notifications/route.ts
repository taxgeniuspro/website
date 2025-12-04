import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Find the profile for this Clerk user
    const profile = await prisma.profile.findUnique({
      where: {
        userId: user.id,
      },
    });

    // If no profile exists yet, return empty array
    if (!profile) {
      return NextResponse.json([]);
    }

    // Fetch notifications for the current user's profile
    const notifications = await prisma.notification.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to 50 most recent notifications
    });

    return NextResponse.json(notifications);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
