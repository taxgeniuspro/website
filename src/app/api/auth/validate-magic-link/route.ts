/**
 * Validate Magic Link Token
 *
 * POST: Check if magic link token is valid and not expired
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailVerified: true,
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json({ valid: false, error: 'Invalid magic link' }, { status: 404 });
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.json({ valid: false, error: 'This link has already been used' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      return NextResponse.json({ valid: false, error: 'This link has expired' }, { status: 400 });
    }

    // Valid!
    return NextResponse.json({
      valid: true,
      email: magicLink.user.email,
      name: magicLink.user.name,
      userId: magicLink.user.id,
    });
  } catch (error) {
    logger.error('Error validating magic link:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate magic link' }, { status: 500 });
  }
}
