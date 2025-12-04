/**
 * Setup Password with Magic Link
 *
 * POST: Set password using magic link token
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            hashedPassword: true,
          },
        },
      },
    });

    if (!magicLink) {
      return NextResponse.json({ error: 'Invalid magic link' }, { status: 404 });
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.json({ error: 'This link has already been used' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > magicLink.expiresAt) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password and mark email as verified
    await prisma.user.update({
      where: { id: magicLink.userId },
      data: {
        hashedPassword,
        emailVerified: new Date(), // Mark as verified
      },
    });

    // Mark magic link as used
    await prisma.magicLink.update({
      where: { id: magicLink.id },
      data: { used: true },
    });

    logger.info(`Password set for user ${magicLink.userId} via magic link`);

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      email: magicLink.user.email,
    });
  } catch (error) {
    logger.error('Error setting password:', error);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
