/**
 * Admin Set Password API Route
 * Allows admins to set password for existing users
 * Also creates profile if missing
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    const currentUser = session?.user;

    // Allow if admin OR if using a special admin key for initial setup
    const adminKey = req.headers.get('x-admin-key');
    const envKey = process.env.ADMIN_SETUP_KEY;
    const isAdminKey = adminKey && envKey && adminKey === envKey;

    logger.debug('[Admin SetPassword] Auth check', {
      hasSession: !!currentUser,
      userRole: currentUser?.role,
      hasAdminKey: !!adminKey,
      hasEnvKey: !!envKey,
      keysMatch: isAdminKey,
    });

    if (!isAdminKey && (!currentUser || currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find user (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user with new password
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword },
    });

    // Create profile if missing
    if (!user.profile) {
      const nameParts = (user.name || '').split(' ').filter(part => part.length > 0);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'client', // Default role for new profiles
          firstName,
          lastName,
          email: user.email?.toLowerCase() || email.toLowerCase(),
        },
      });

      logger.info('[Admin] Created missing profile for user', { email });
    }

    logger.info('[Admin] Password set for user', { email });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      profileCreated: !user.profile,
    });
  } catch (error) {
    logger.error('Admin set password error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
