/**
 * Short Links API
 *
 * GET /api/links - Get all user's short links
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserShortLinks } from '@/lib/services/short-link.service';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create profile using upsert to avoid race conditions
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {}, // No updates if exists
      create: {
        userId: userId,
        role: 'lead', // Default role, user will select proper role later
      },
      select: { id: true, role: true },
    });

    logger.info(`Profile resolved: ${profile.id}`);

    // Get user's short links
    const links = await getUserShortLinks(profile.id);

    return NextResponse.json({
      success: true,
      links: links,
      count: links.length,
    });
  } catch (error) {
    logger.error('Error fetching short links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
