/**
 * Payout Request API
 *
 * POST /api/payouts/request
 * Creates a payout request for authenticated user
 *
 * Part of Epic 6: Lead Tracking Dashboard Enhancement - Story 6
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { requestPayout } from '@/lib/services/commission.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const payoutRequestSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.enum(['PAYPAL', 'BANK_TRANSFER', 'CHECK', 'VENMO', 'CASHAPP']),
  paymentDetails: z.string().min(1, 'Payment details are required'),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile with username
    const profile = await prisma.profile.findUnique({
      where: { clerkId: userId },
      select: {
        id: true,
        shortLinkUsername: true,
        role: true,
      },
    });

    if (!profile || !profile.shortLinkUsername) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = payoutRequestSchema.parse(body);

    // Request payout
    const result = await requestPayout(
      profile.shortLinkUsername,
      validatedData.amount,
      validatedData.paymentMethod,
      validatedData.paymentDetails
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payoutId: result.payoutId,
      message: 'Payout request submitted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Error creating payout request', { error });
    return NextResponse.json({ error: 'Failed to create payout request' }, { status: 500 });
  }
}
