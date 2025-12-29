/**
 * Debug endpoint to check session and role
 * GET /api/debug/session
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';

// TypeScript interface for Profile
interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get role directly from database
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
      .eq('userId', session.user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      throw profileError;
    }

    const profile = profileData as Profile | null;

    // Supabase inspection (replaces Prisma inspection)
    const supabaseRoleInspection = {
      value: profile?.role,
      type: typeof profile?.role,
      toString: profile?.role?.toString?.(),
      valueOf: profile?.role?.valueOf?.(),
      json: JSON.stringify(profile?.role),
      isString: typeof profile?.role === 'string',
      constructorName: profile?.role?.constructor?.name,
    };

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        roleFromSession: session.user.role,
        roleType: typeof session.user.role,
        roleJSON: JSON.stringify(session.user.role),
      },
      profileFromSupabase: profile,
      supabaseRoleInspection,
      comparison: {
        sessionRole: session.user.role,
        supabaseRole: profile?.role,
        sessionMatchesSupabase: session.user.role === profile?.role,
        sessionRoleToStringMatchesSupabase: String(session.user.role) === String(profile?.role),
      },
      fix: {
        message: 'The JWT token has a stale role. Sign out and sign back in to refresh it.',
        signOutUrl: '/auth/signout',
      },
    });
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json(
      { error: 'Internal error', details: String(error) },
      { status: 500 }
    );
  }
}
