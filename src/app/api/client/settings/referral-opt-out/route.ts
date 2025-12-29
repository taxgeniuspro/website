/**
 * Client Settings - Referral Program Opt-Out
 *
 * POST /api/client/settings/referral-opt-out
 * Toggle visibility of referral program features in the client dashboard
 *
 * Body: { hideReferralProgram: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase data
interface Profile {
  id: string;
  hideReferralProgram: boolean | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { hideReferralProgram } = body;

    if (typeof hideReferralProgram !== 'boolean') {
      return NextResponse.json(
        { error: 'hideReferralProgram must be a boolean' },
        { status: 400 }
      );
    }

    // Find profile first - use OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const existingProfile = firstOrNull<{ id: string }>(profileData);

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Update profile
    const { data: updatedProfile, error: updateError } = await db
      .from('profiles')
      .update({ hide_referral_program: hideReferralProgram })
      .eq('id', existingProfile.id)
      .select('id, hide_referral_program')
      .single();

    if (updateError) {
      logger.error('Error updating profile:', updateError);
      return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 });
    }

    logger.info(`User ${userId} set hideReferralProgram to ${hideReferralProgram}`);

    return NextResponse.json({
      success: true,
      hideReferralProgram: updatedProfile?.hide_referral_program ?? hideReferralProgram,
    });
  } catch (error) {
    logger.error('Error updating referral program preference', { error });
    return NextResponse.json(
      { error: 'Failed to update preference' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('hide_referral_program')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch preference' }, { status: 500 });
    }

    const profile = firstOrNull<{ hide_referral_program: boolean | null }>(profileData);

    return NextResponse.json({
      hideReferralProgram: profile?.hide_referral_program ?? false,
    });
  } catch (error) {
    logger.error('Error fetching referral program preference', { error });
    return NextResponse.json(
      { error: 'Failed to fetch preference' },
      { status: 500 }
    );
  }
}
