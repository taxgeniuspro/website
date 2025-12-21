/**
 * Link Google Account API Endpoint
 *
 * POST /api/auth/link-google
 *
 * Initiates Google OAuth for account linking.
 * Requires authenticated session.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { createStateToken, generateNonce } from '@/lib/utils/hmac';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Check if user already has a Google account linked
    const existingGoogleAccount = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    });

    if (existingGoogleAccount) {
      return NextResponse.json(
        { error: 'Google account already linked to your account' },
        { status: 400 }
      );
    }

    // Create a signed state token containing:
    // - action: 'link' to identify this as a linking request
    // - userId: current user's ID
    // - email: user's email for verification
    // - nonce: random value for additional security
    const statePayload = {
      action: 'link',
      userId,
      email: userEmail,
      nonce: generateNonce(),
    };

    const signedState = createStateToken(statePayload, 10 * 60 * 1000); // 10 minute expiration

    // Build Google OAuth URL
    const googleOAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleOAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    googleOAuthUrl.searchParams.set(
      'redirect_uri',
      `${process.env.NEXTAUTH_URL}/api/auth/link-google/callback`
    );
    googleOAuthUrl.searchParams.set('response_type', 'code');
    googleOAuthUrl.searchParams.set('scope', 'openid email profile');
    googleOAuthUrl.searchParams.set('access_type', 'offline');
    googleOAuthUrl.searchParams.set('prompt', 'consent');
    googleOAuthUrl.searchParams.set('state', signedState);

    logger.info('Initiating Google account linking', { userId, email: userEmail });

    return NextResponse.json({ redirectUrl: googleOAuthUrl.toString() });
  } catch (error) {
    logger.error('Error initiating Google account link', { error });
    return NextResponse.json(
      { error: 'Failed to initiate account linking' },
      { status: 500 }
    );
  }
}
