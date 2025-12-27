/**
 * Supabase Auth Callback Handler
 * Handles OAuth redirects and email confirmations
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';
import { ContactType } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/en/dashboard';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Can happen in middleware
            }
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Sync user with our database profile
      await syncUserProfile(user);

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to sign in page with error
  return NextResponse.redirect(`${origin}/en/auth/signin?error=auth_callback_error`);
}

/**
 * Sync Supabase user with our database profile
 */
async function syncUserProfile(user: { id: string; email?: string; user_metadata?: any }) {
  const email = user.email?.toLowerCase();
  if (!email) {
    logger.error('[Auth Callback] No email for user', { supabaseUserId: user.id });
    return;
  }

  const firstName = user.user_metadata?.first_name || user.user_metadata?.name?.split(' ')[0] || '';
  const lastName = user.user_metadata?.last_name || user.user_metadata?.name?.split(' ').slice(1).join(' ') || '';

  try {
    // Check if profile exists
    let profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: user.id },
          { email },
        ],
      },
    });

    // Check if User exists
    let dbUser = await prisma.user.findUnique({
      where: { email },
    });

    // Create user if doesn't exist
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`.trim() || null,
          image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        },
      });
      logger.info('[Auth Callback] Created User for Supabase user', {
        userId: dbUser.id,
        supabaseUserId: user.id
      });
    }

    // Create profile if doesn't exist
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId: dbUser.id,
          supabaseUserId: user.id,
          email,
          role: 'client',
          firstName,
          lastName,
          affiliateStatus: 'APPROVED',
          affiliateApprovedAt: new Date(),
        },
      });
      logger.info('[Auth Callback] Created Profile for Supabase user', {
        profileId: profile.id,
        supabaseUserId: user.id
      });

      // Assign tracking code
      try {
        await assignTrackingCodeToUser(profile.id);
        logger.info('[Auth Callback] Assigned tracking code', { profileId: profile.id });
      } catch (err) {
        logger.error('[Auth Callback] Failed to assign tracking code', { error: err });
      }
    } else if (!profile.supabaseUserId) {
      // Update existing profile with supabaseUserId
      await prisma.profile.update({
        where: { id: profile.id },
        data: { supabaseUserId: user.id },
      });
      logger.info('[Auth Callback] Updated profile with supabaseUserId', {
        profileId: profile.id,
        supabaseUserId: user.id
      });
    }

    // Create/update CRM contact
    const existingContact = await prisma.cRMContact.findUnique({
      where: { email },
    });

    if (existingContact) {
      await prisma.cRMContact.update({
        where: { id: existingContact.id },
        data: {
          userId: dbUser.id,
          firstName: firstName || existingContact.firstName,
          lastName: lastName || existingContact.lastName,
          contactType: ContactType.CLIENT,
          lastContactedAt: new Date(),
        },
      });
    } else {
      await prisma.cRMContact.create({
        data: {
          userId: dbUser.id,
          email,
          firstName: firstName || 'Unknown',
          lastName: lastName || '',
          contactType: ContactType.CLIENT,
          stage: 'NEW',
          source: 'supabase_oauth',
        },
      });
    }
  } catch (error) {
    logger.error('[Auth Callback] Error syncing user profile', {
      error,
      supabaseUserId: user.id,
      email
    });
  }
}
