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
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    // Update the user's profile
    const profile = await prisma.profile.update({
      where: { userId },
      data: { hideReferralProgram },
      select: {
        id: true,
        hideReferralProgram: true,
      },
    });

    logger.info(`🔧 User ${userId} set hideReferralProgram to ${hideReferralProgram}`);

    return NextResponse.json({
      success: true,
      hideReferralProgram: profile.hideReferralProgram,
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

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        hideReferralProgram: true,
      },
    });

    return NextResponse.json({
      hideReferralProgram: profile?.hideReferralProgram ?? false,
    });
  } catch (error) {
    logger.error('Error fetching referral program preference', { error });
    return NextResponse.json(
      { error: 'Failed to fetch preference' },
      { status: 500 }
    );
  }
}
