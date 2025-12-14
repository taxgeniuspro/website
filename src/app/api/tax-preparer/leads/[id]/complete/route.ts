/**
 * Complete Lead API
 *
 * Marks a lead/referral as COMPLETE after tax return is filed.
 * This triggers commission credit for the referrer (if any).
 *
 * POST /api/tax-preparer/leads/:id/complete
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculateReferrerCommission } from '@/lib/services/tiered-commission.service';
import { PaymentStatus } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    const isAdmin = role === 'admin';
    const isTaxPreparer = role === 'tax_preparer';

    if (!isAdmin && !isTaxPreparer) {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can complete leads' },
        { status: 403 }
      );
    }

    const { id: leadId } = await params;

    // Get preparer's profile
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!preparerProfile) {
      return NextResponse.json(
        { error: 'Tax preparer profile not found' },
        { status: 404 }
      );
    }

    // Fetch the lead
    const lead = await prisma.taxIntakeLead.findUnique({
      where: { id: leadId },
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Tax preparers can only complete their assigned leads
    if (isTaxPreparer && lead.assignedPreparerId !== preparerProfile.id) {
      return NextResponse.json(
        { error: 'Forbidden: This lead is not assigned to you' },
        { status: 403 }
      );
    }

    // Check if lead is already completed (check for existing commission with this lead)
    const existingCommission = await prisma.commission.findFirst({
      where: {
        sourceType: 'RETURN_FILED',
        sourceId: leadId,
      },
    });

    if (existingCommission) {
      return NextResponse.json(
        {
          error: 'Lead has already been marked as complete',
          commissionId: existingCommission.id,
        },
        { status: 400 }
      );
    }

    // Find the referrer based on referrerUsername
    let referrerProfile = null;
    let commissionResult = null;

    if (lead.referrerUsername) {
      // Find profile with this tracking code
      referrerProfile = await prisma.profile.findFirst({
        where: {
          customTrackingCode: lead.referrerUsername,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (referrerProfile) {
        // Count completed referrals for this referrer (to determine tier)
        const completedReferralsCount = await prisma.commission.count({
          where: {
            referrerId: referrerProfile.id,
            sourceType: 'RETURN_FILED',
            status: { in: [PaymentStatus.APPROVED, PaymentStatus.PAID] },
          },
        });

        // Calculate commission based on preparer's settings
        commissionResult = await calculateReferrerCommission(
          preparerProfile.id,
          referrerProfile.id,
          completedReferralsCount + 1 // This is the next referral
        );

        // Create commission record - APPROVED status means ready for payout
        // Tax preparer will mark as PAID once they pay the affiliate
        await prisma.commission.create({
          data: {
            referrerId: referrerProfile.id,
            amount: commissionResult.amount,
            sourceType: 'RETURN_FILED',
            sourceId: leadId,
            clientName: `${lead.first_name} ${lead.last_name}`,
            clientEmail: lead.email,
            commissionType: 'FLAT',
            commissionRate: commissionResult.rate,
            rateSource: commissionResult.source,
            status: PaymentStatus.APPROVED,
            approvedAt: new Date(),
          },
        });

        logger.info('Commission created for referrer', {
          referrerId: referrerProfile.id,
          referrerName: `${referrerProfile.firstName} ${referrerProfile.lastName}`,
          amount: commissionResult.amount,
          tier: commissionResult.tier,
          source: commissionResult.source,
          leadId,
        });
      }
    }

    // Update lead status
    await prisma.taxIntakeLead.update({
      where: { id: leadId },
      data: {
        convertedToClient: true,
        convertedAt: new Date(),
        contactNotes: lead.contactNotes
          ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Return filed - marked as COMPLETE`
          : `[${new Date().toISOString()}] Return filed - marked as COMPLETE`,
        updated_at: new Date(),
      },
    });

    // Create lead activity
    await prisma.leadActivity.create({
      data: {
        leadId,
        type: 'STATUS_CHANGED',
        description: 'Lead marked as COMPLETE - tax return filed',
        metadata: {
          previousStatus: 'IN_PROGRESS',
          newStatus: 'COMPLETE',
          commissionCredited: !!commissionResult,
          commissionAmount: commissionResult?.amount || 0,
        },
      },
    });

    logger.info('Lead marked as complete', {
      leadId,
      preparerId: preparerProfile.id,
      referrerUsername: lead.referrerUsername,
      commissionCredited: !!commissionResult,
    });

    return NextResponse.json({
      success: true,
      message: 'Lead marked as complete',
      leadId,
      commission: commissionResult
        ? {
            amount: commissionResult.amount,
            tier: commissionResult.tier,
            referrerName: referrerProfile
              ? `${referrerProfile.firstName} ${referrerProfile.lastName}`
              : null,
          }
        : null,
    });
  } catch (error) {
    logger.error('Error completing lead:', error);
    return NextResponse.json(
      { error: 'Failed to complete lead' },
      { status: 500 }
    );
  }
}
