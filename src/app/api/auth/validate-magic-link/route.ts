/**
 * Validate Password Setup Token
 *
 * POST: Check if password setup token is valid and not expired
 * Note: This endpoint is used for password setup flows (not magic link auth)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

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
  name: string | null;
  emailVerified: Date | null;
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ valid: false, error: 'No token provided' }, { status: 400 });
    }

    // Find token in magic_links table (used for password setup tokens)
    const { data: magicLinksData, error: magicLinkError } = await db
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .limit(1);

    if (magicLinkError) {
      logger.error('Error finding magic link', { error: magicLinkError.message });
      return NextResponse.json({ valid: false, error: 'Failed to validate link' }, { status: 500 });
    }

    const passwordToken = firstOrNull<MagicLink>(magicLinksData);

    if (!passwordToken) {
      return NextResponse.json({ valid: false, error: 'Invalid link' }, { status: 404 });
    }

    // Check if already used
    if (passwordToken.used) {
      return NextResponse.json({ valid: false, error: 'This link has already been used' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > new Date(passwordToken.expiresAt)) {
      return NextResponse.json({ valid: false, error: 'This link has expired' }, { status: 400 });
    }

    // Get user info
    const { data: usersData } = await db
      .from('users')
      .select('id, email, name, emailVerified')
      .eq('id', passwordToken.userId)
      .limit(1);

    const user = firstOrNull<User>(usersData);

    if (!user) {
      return NextResponse.json({ valid: false, error: 'User not found' }, { status: 404 });
    }

    // Valid!
    return NextResponse.json({
      valid: true,
      email: user.email,
      name: user.name,
      userId: user.id,
    });
  } catch (error) {
    logger.error('Error validating token:', error);
    return NextResponse.json({ valid: false, error: 'Failed to validate link' }, { status: 500 });
  }
}
