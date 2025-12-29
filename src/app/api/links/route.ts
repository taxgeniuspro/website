/**
 * Short Links API
 *
 * GET /api/links - Get all user's short links
 */

import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { getUserShortLinks } from '@/lib/services/short-link.service';
import { logger } from '@/lib/logger';

// TypeScript interface for Profile
interface Profile {
  id: string;
  role: string;
}

export async function GET() {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get or create profile using flexible lookup
    const { data: profileData, error: findError } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (findError) {
      throw findError;
    }

    let profile = firstOrNull(profileData) as Profile | null;

    // Create profile if not found
    if (!profile) {
      const { data: newProfile, error: createError } = await db
        .from('profiles')
        .insert({
          userId: userId,
          supabaseUserId: userId,
          email: session?.user?.email,
          role: 'client', // Default role for registered users
        })
        .select('id, role')
        .single();

      if (createError) {
        throw createError;
      }

      profile = newProfile as Profile;
    }

    logger.info(`Profile resolved: ${profile.id}`);

    // Get user's short links
    const links = await getUserShortLinks(profile.id);

    return NextResponse.json({
      success: true,
      links: links,
      count: links.length,
    });
  } catch (error) {
    logger.error('Error fetching short links:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
