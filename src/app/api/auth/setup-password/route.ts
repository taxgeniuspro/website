/**
 * Setup Password with Magic Link
 *
 * POST: Set password using magic link token
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import bcrypt from 'bcryptjs';

// Local TypeScript interfaces (replaces @prisma/client types)
interface MagicLink {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

interface User {
  id: string;
  email: string | null;
  hashedPassword: string | null;
}

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
    const { data: magicLinksData, error: magicLinkError } = await db
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (magicLinkError) {
      logger.error('Error finding magic link', { error: magicLinkError.message });
      return NextResponse.json({ error: 'Failed to validate link' }, { status: 500 });
    }

    const magicLink = firstOrNull<MagicLink>(magicLinksData);

    if (!magicLink) {
      return NextResponse.json({ error: 'Invalid magic link' }, { status: 404 });
    }

    // Check if already used
    if (magicLink.used) {
      return NextResponse.json({ error: 'This link has already been used' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > new Date(magicLink.expiresAt)) {
      return NextResponse.json({ error: 'This link has expired' }, { status: 400 });
    }

    // Get user info
    const { data: usersData } = await db
      .from('users')
      .select('id, email, hashedPassword')
      .eq('id', magicLink.userId)
      .limit(1);

    const user = firstOrNull<User>(usersData);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user with password and mark email as verified
    const { error: updateError } = await db
      .from('users')
      .update({
        hashedPassword,
        emailVerified: new Date().toISOString(), // Mark as verified
      })
      .eq('id', magicLink.userId);

    if (updateError) {
      logger.error('Error updating user password', { error: updateError.message });
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
    }

    // Mark magic link as used
    await db
      .from('magic_links')
      .update({ used: true })
      .eq('id', magicLink.id);

    logger.info(`Password set for user ${magicLink.userId} via magic link`);

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
      email: user.email,
    });
  } catch (error) {
    logger.error('Error setting password:', error);
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 });
  }
}
