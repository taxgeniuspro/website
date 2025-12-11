/**
 * Admin Set Password API Route
 * Allows admins to set password for existing users
 * Also creates profile if missing
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();
    const currentUser = session?.user;

    // Allow if admin OR if using a special admin key for initial setup
    const adminKey = req.headers.get('x-admin-key');
    const isAdminKey = adminKey === process.env.ADMIN_SETUP_KEY;

    if (!isAdminKey && (!currentUser || !['admin', 'super_admin'].includes(currentUser.role as string))) {
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
      let firstName = nameParts[0] || '';
      let lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'lead',
          firstName,
          lastName,
          email: user.email?.toLowerCase() || email.toLowerCase(),
        },
      });

      console.log('[Admin] Created missing profile for user:', email);
    }

    console.log('[Admin] Password set for user:', email);

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      profileCreated: !user.profile,
    });
  } catch (error) {
    console.error('Admin set password error:', error);
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
