/**
 * Admin Set Password API Route
 * Allows admins to set password for existing users
 * Also creates profile if missing
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Local TypeScript interfaces (replaces @prisma/client types)
interface User {
  id: string;
  email: string | null;
  name: string | null;
  hashedPassword: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Profile {
  id: string;
  userId: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  affiliateStatus: string | null;
  affiliateApprovedAt: Date | null;
}

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
    const { data: usersData, error: userError } = await db
      .from('users')
      .select('*')
      .ilike('email', email)
      .limit(1);

    if (userError) {
      logger.error('[Admin SetPassword] Error finding user', { error: userError.message });
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const user = firstOrNull<User>(usersData);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has a profile
    const { data: profilesData } = await db
      .from('profiles')
      .select('*')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull<Profile>(profilesData);

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update user with new password
    const { error: updateError } = await db
      .from('users')
      .update({ hashedPassword })
      .eq('id', user.id);

    if (updateError) {
      logger.error('[Admin SetPassword] Error updating password', { error: updateError.message });
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // Create profile if missing
    if (!profile) {
      const nameParts = (user.name || '').split(' ').filter(part => part.length > 0);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      // Note: Profile doesn't have an 'email' field - email is stored on User
      const { error: profileError } = await db
        .from('profiles')
        .insert({
          userId: user.id,
          role: 'client', // Default role for new profiles
          firstName,
          lastName,
          affiliateStatus: 'APPROVED', // Auto-approve as affiliate
          affiliateApprovedAt: new Date().toISOString(),
        });

      if (profileError) {
        logger.error('[Admin SetPassword] Error creating profile', { error: profileError.message });
        // Don't return error - password was set successfully
      } else {
        logger.info('[Admin] Created missing profile for user', { email });
      }
    }

    logger.info('[Admin] Password set for user', { email });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      profileCreated: !profile,
    });
  } catch (error) {
    logger.error('Admin set password error', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'Failed to set password' },
      { status: 500 }
    );
  }
}
