/**
 * Supabase Auth Callback Handler
 * Handles OAuth redirects and email confirmations
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { assignTrackingCodeToUser } from '@/lib/services/tracking-code.service';

// Local type for ContactType (replaces @prisma/client import)
type ContactType = 'CLIENT' | 'LEAD' | 'PROSPECT' | 'PARTNER' | 'VENDOR';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/en/dashboard';

  // Use NEXT_PUBLIC_APP_URL to avoid wrong redirect behind reverse proxy
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax';

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

      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  // Return to sign in page with error
  return NextResponse.redirect(`${baseUrl}/en/auth/signin?error=auth_callback_error`);
}

// Interfaces for database records
interface Profile {
  id: string;
  userId: string | null; // Nullable for pre-created profiles (tax preparer migration)
  supabaseUserId: string | null;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  affiliateStatus: string | null;
  affiliateApprovedAt: string | null;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

interface CRMContact {
  id: string;
  userId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  contactType: ContactType;
  stage: string;
  source: string | null;
  lastContactedAt: string | null;
}

/**
 * Sync Supabase user with our database profile
 */
async function syncUserProfile(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const email = user.email?.toLowerCase();
  if (!email) {
    logger.error('[Auth Callback] No email for user', { supabaseUserId: user.id });
    return;
  }

  const firstName = (user.user_metadata?.first_name as string) || (user.user_metadata?.name as string)?.split(' ')[0] || '';
  const lastName = (user.user_metadata?.last_name as string) || (user.user_metadata?.name as string)?.split(' ').slice(1).join(' ') || '';

  try {
    // Check if profile exists (by supabaseUserId or email)
    const { data: profileBySupabaseId } = await db.from('profiles')
      .select('*')
      .eq('supabaseUserId', user.id)
      .limit(1);

    const { data: profileByEmail } = await db.from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1);

    let profile: Profile | null = firstOrNull(profileBySupabaseId) || firstOrNull(profileByEmail);

    // Check if User exists
    const { data: existingUsers } = await db.from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    let dbUser: User | null = firstOrNull(existingUsers);

    // Create user if doesn't exist
    if (!dbUser) {
      const { data: newUser, error: userError } = await db.from('users')
        .insert({
          email,
          name: `${firstName} ${lastName}`.trim() || null,
          image: (user.user_metadata?.avatar_url as string) || (user.user_metadata?.picture as string) || null,
        })
        .select()
        .single();

      if (userError) {
        logger.error('[Auth Callback] Failed to create User', { error: userError });
        throw userError;
      }

      dbUser = newUser;
      logger.info('[Auth Callback] Created User for Supabase user', {
        userId: dbUser.id,
        supabaseUserId: user.id
      });
    }

    // Create profile if doesn't exist
    if (!profile) {
      const { data: newProfile, error: profileError } = await db.from('profiles')
        .insert({
          userId: dbUser.id,
          supabaseUserId: user.id,
          email,
          role: 'client',
          firstName,
          lastName,
          affiliateStatus: 'APPROVED',
          affiliateApprovedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        logger.error('[Auth Callback] Failed to create Profile', { error: profileError });
        throw profileError;
      }

      profile = newProfile;
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
    } else {
      // Profile exists - update supabaseUserId and userId if missing
      const updateFields: Record<string, unknown> = {};

      if (!profile.supabaseUserId) {
        updateFields.supabaseUserId = user.id;
      }

      // Link profile to user if not already linked (handles pre-created tax preparers)
      if (!profile.userId && dbUser) {
        updateFields.userId = dbUser.id;
      }

      if (Object.keys(updateFields).length > 0) {
        const { error: updateError } = await db.from('profiles')
          .update(updateFields)
          .eq('id', profile.id);

        if (updateError) {
          logger.error('[Auth Callback] Failed to update profile', { error: updateError });
        } else {
          logger.info('[Auth Callback] Updated profile with missing fields', {
            profileId: profile.id,
            role: profile.role,
            updates: Object.keys(updateFields),
          });
        }
      }
    }

    // Create/update CRM contact
    const { data: existingContacts } = await db.from('crm_contacts')
      .select('*')
      .eq('email', email)
      .limit(1);

    const existingContact: CRMContact | null = firstOrNull(existingContacts);

    if (existingContact) {
      const { error: contactUpdateError } = await db.from('crm_contacts')
        .update({
          userId: dbUser.id,
          firstName: firstName || existingContact.firstName,
          lastName: lastName || existingContact.lastName,
          contactType: 'CLIENT' as ContactType,
          lastContactedAt: new Date().toISOString(),
        })
        .eq('id', existingContact.id);

      if (contactUpdateError) {
        logger.error('[Auth Callback] Failed to update CRM contact', { error: contactUpdateError });
      }
    } else {
      const { error: contactCreateError } = await db.from('crm_contacts')
        .insert({
          userId: dbUser.id,
          email,
          firstName: firstName || 'Unknown',
          lastName: lastName || '',
          contactType: 'CLIENT' as ContactType,
          stage: 'NEW',
          source: 'supabase_oauth',
        });

      if (contactCreateError) {
        logger.error('[Auth Callback] Failed to create CRM contact', { error: contactCreateError });
      }
    }
  } catch (error) {
    logger.error('[Auth Callback] Error syncing user profile', {
      error,
      supabaseUserId: user.id,
      email
    });
  }
}
