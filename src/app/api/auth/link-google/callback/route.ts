/**
 * Link Google Account Callback Handler
 *
 * GET /api/auth/link-google/callback
 *
 * Handles Google OAuth callback for account linking.
 * Exchanges authorization code for tokens and creates Account record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifyStateToken } from '@/lib/utils/hmac';

// Local TypeScript interfaces (replaces @prisma/client types)
interface Account {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
}

interface User {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
}

// Helper to get the base URL for redirects
function getSettingsUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.origin}/dashboard/client/settings`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const settingsUrl = getSettingsUrl(request);

  // Handle OAuth errors (user cancelled, etc.)
  if (error) {
    logger.warn('Google OAuth error during linking', { error });
    return NextResponse.redirect(`${settingsUrl}?link_error=oauth_denied`);
  }

  if (!code || !state) {
    logger.warn('Missing code or state in OAuth callback');
    return NextResponse.redirect(`${settingsUrl}?link_error=missing_params`);
  }

  try {
    // Verify and decode the state token
    const statePayload = verifyStateToken(state);

    if (!statePayload) {
      logger.warn('Invalid or expired state token during Google linking');
      return NextResponse.redirect(`${settingsUrl}?link_error=invalid_state`);
    }

    // Verify this is a link action
    if (statePayload.action !== 'link') {
      logger.warn('Invalid action in state token', { action: statePayload.action });
      return NextResponse.redirect(`${settingsUrl}?link_error=invalid_action`);
    }

    const userId = statePayload.userId as string;
    const expectedEmail = (statePayload.email as string).toLowerCase();

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/link-google/callback`,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('Failed to exchange code for tokens', { error: errorText });
      return NextResponse.redirect(`${settingsUrl}?link_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      logger.error('No access token in response');
      return NextResponse.redirect(`${settingsUrl}?link_error=no_access_token`);
    }

    // Get Google user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userInfoResponse.ok) {
      logger.error('Failed to get Google user info');
      return NextResponse.redirect(`${settingsUrl}?link_error=userinfo_failed`);
    }

    const googleUser = await userInfoResponse.json();

    // Security check: Verify the Google email matches the user's email
    if (googleUser.email.toLowerCase() !== expectedEmail) {
      logger.warn('Google email mismatch during linking', {
        userId,
        expectedEmail,
        googleEmail: googleUser.email,
      });
      return NextResponse.redirect(`${settingsUrl}?link_error=email_mismatch`);
    }

    // Check if this Google account is already linked to another user
    const { data: existingAccountData } = await db
      .from('accounts')
      .select('*')
      .eq('provider', 'google')
      .eq('providerAccountId', googleUser.id)
      .limit(1);

    const existingAccount = firstOrNull<Account>(existingAccountData);

    if (existingAccount) {
      if (existingAccount.userId === userId) {
        // Already linked to this user - just redirect with success
        logger.info('Google account already linked to this user', { userId });
        return NextResponse.redirect(`${settingsUrl}?link_success=google`);
      }

      logger.warn('Google account already linked to different user', {
        userId,
        existingUserId: existingAccount.userId,
      });
      return NextResponse.redirect(`${settingsUrl}?link_error=already_linked_other`);
    }

    // Verify user still exists
    const { data: usersData } = await db
      .from('users')
      .select('*')
      .eq('id', userId)
      .limit(1);

    const user = firstOrNull<User>(usersData);

    if (!user) {
      logger.error('User not found during Google linking', { userId });
      return NextResponse.redirect(`${settingsUrl}?link_error=user_not_found`);
    }

    // Create the account link
    const { error: createAccountError } = await db
      .from('accounts')
      .insert({
        userId,
        type: 'oauth',
        provider: 'google',
        providerAccountId: googleUser.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expires_in
          ? Math.floor(Date.now() / 1000) + tokens.expires_in
          : null,
        token_type: tokens.token_type,
        scope: tokens.scope,
        id_token: tokens.id_token,
      });

    if (createAccountError) {
      logger.error('Error creating account link', { error: createAccountError.message });
      return NextResponse.redirect(`${settingsUrl}?link_error=failed`);
    }

    // Optionally update user profile with Google image if not set
    if (!user.image && googleUser.picture) {
      await db
        .from('users')
        .update({ image: googleUser.picture })
        .eq('id', userId);
    }

    // Mark email as verified since Google verified it
    if (!user.emailVerified) {
      await db
        .from('users')
        .update({ emailVerified: new Date().toISOString() })
        .eq('id', userId);
    }

    logger.info('Successfully linked Google account', {
      userId,
      googleId: googleUser.id,
      email: googleUser.email,
    });

    return NextResponse.redirect(`${settingsUrl}?link_success=google`);
  } catch (error) {
    logger.error('Error during Google account linking callback', { error });
    return NextResponse.redirect(`${settingsUrl}?link_error=failed`);
  }
}
