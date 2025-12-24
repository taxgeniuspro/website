/**
 * Validate Password Setup Token
 *
 * POST: Check if password setup token is valid and not expired
 * Note: This endpoint is used for password setup flows (not magic link auth)
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

    // Find token in magic_links table (used for password setup tokens)
    const passwordToken = await prisma.magicLink.findUnique({
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

    if (!passwordToken) {
      return NextResponse.json({ valid: false, error: 'Invalid link' }, { status: 404 });
    }

    // Check if already used
    if (passwordToken.used) {
      return NextResponse.json({ valid: false, error: 'This link has already been used' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > passwordToken.expiresAt) {
      return NextResponse.json({ valid: false, error: 'This link has expired' }, { status: 400 });
    }

    // Valid!
    return NextResponse.json({
      valid: true,
      email: passwordToken.user.email,
      name: passwordToken.user.name,
      userId: passwordToken.user.id,
    });
  } catch (error) {
    logger.error('Error validating token:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate link' }, { status: 500 });
  }
}
