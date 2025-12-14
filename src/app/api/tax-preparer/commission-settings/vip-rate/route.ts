/**
 * VIP Rate API
 *
 * Allows tax preparers to set individual VIP commission rates for specific referrers.
 *
 * POST: Set or update VIP rate for a referrer
 * DELETE: Remove VIP rate (referrer will use tier rates)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { setReferrerVIPRate } from '@/lib/services/tiered-commission.service';
import { logger } from '@/lib/logger';

/**
 * POST /api/tax-preparer/commission-settings/vip-rate
 *
 * Sets a VIP rate for a specific referrer
 * Body: { referrerId: string, vipRate: number }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'tax_preparer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { referrerId, vipRate } = body;

    // Validate input
    if (!referrerId || typeof referrerId !== 'string') {
      return NextResponse.json(
        { error: 'referrerId is required' },
        { status: 400 }
      );
    }

    if (typeof vipRate !== 'number' || vipRate <= 0) {
      return NextResponse.json(
        { error: 'vipRate must be a positive number' },
        { status: 400 }
      );
    }

    // Verify referrer exists
    const referrer = await prisma.profile.findUnique({
      where: { id: referrerId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    // Set the VIP rate
    await setReferrerVIPRate(profile.id, referrerId, vipRate);

    logger.info('VIP rate set', {
      preparerId: profile.id,
      referrerId,
      vipRate,
    });

    return NextResponse.json({
      success: true,
      referrerId,
      vipRate,
      message: `VIP rate of $${vipRate} set for ${referrer.firstName || 'referrer'} ${referrer.lastName || ''}`.trim(),
    });
  } catch (error) {
    logger.error('Error setting VIP rate', { error });
    return NextResponse.json({ error: 'Failed to set VIP rate' }, { status: 500 });
  }
}

/**
 * DELETE /api/tax-preparer/commission-settings/vip-rate
 *
 * Removes the VIP rate for a referrer (they will use tier rates)
 * Body: { referrerId: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'tax_preparer' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { referrerId } = body;

    if (!referrerId || typeof referrerId !== 'string') {
      return NextResponse.json(
        { error: 'referrerId is required' },
        { status: 400 }
      );
    }

    // Remove the VIP rate (set to null)
    await setReferrerVIPRate(profile.id, referrerId, null);

    logger.info('VIP rate removed', {
      preparerId: profile.id,
      referrerId,
    });

    return NextResponse.json({
      success: true,
      referrerId,
      message: 'VIP rate removed. Referrer will now use tier rates.',
    });
  } catch (error) {
    logger.error('Error removing VIP rate', { error });
    return NextResponse.json({ error: 'Failed to remove VIP rate' }, { status: 500 });
  }
}
