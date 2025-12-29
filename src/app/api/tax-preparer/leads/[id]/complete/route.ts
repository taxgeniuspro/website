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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { calculateReferrerCommission } from '@/lib/services/tiered-commission.service';

// Define PaymentStatus locally (matches database enum)
type PaymentStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED' | 'FAILED';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const preparerProfile = firstOrNull(profiles);

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Tax preparer profile not found' }, { status: 404 });
    }

    // Fetch the lead
    const { data: leads } = await db
      .from('tax_intake_leads')
      .select(
        `
        *,
        profile:profiles!profileId (
          id,
          firstName,
          lastName
        )
      `
      )
      .eq('id', leadId)
      .limit(1);

    const lead = firstOrNull(leads);

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
    const { data: existingCommissions } = await db
      .from('commissions')
      .select('id')
      .eq('sourceType', 'RETURN_FILED')
      .eq('sourceId', leadId)
      .limit(1);

    const existingCommission = firstOrNull(existingCommissions);

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
      const { data: referrerProfiles } = await db
        .from('profiles')
        .select('id, firstName, lastName, role')
        .eq('customTrackingCode', lead.referrerUsername)
        .limit(1);

      referrerProfile = firstOrNull(referrerProfiles);

      if (referrerProfile) {
        // Count completed referrals for this referrer (to determine tier)
        const { count: completedReferralsCount } = await db
          .from('commissions')
          .select('id', { count: 'exact', head: true })
          .eq('referrerId', referrerProfile.id)
          .eq('sourceType', 'RETURN_FILED')
          .in('status', ['APPROVED', 'PAID'] as PaymentStatus[]);

        // Calculate commission based on preparer's settings
        commissionResult = await calculateReferrerCommission(
          preparerProfile.id,
          referrerProfile.id,
          (completedReferralsCount || 0) + 1 // This is the next referral
        );

        // Create commission record - APPROVED status means ready for payout
        const { error: commissionError } = await db.from('commissions').insert({
          referrerId: referrerProfile.id,
          amount: commissionResult.amount,
          sourceType: 'RETURN_FILED',
          sourceId: leadId,
          clientName: `${lead.first_name} ${lead.last_name}`,
          clientEmail: lead.email,
          commissionType: 'FLAT',
          commissionRate: commissionResult.rate,
          rateSource: commissionResult.source,
          status: 'APPROVED' as PaymentStatus,
          approvedAt: new Date().toISOString(),
        });

        if (commissionError) {
          logger.error('Failed to create commission:', commissionError);
        } else {
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
    }

    // Update lead status
    const updatedNotes = lead.contactNotes
      ? `${lead.contactNotes}\n\n[${new Date().toISOString()}] Return filed - marked as COMPLETE`
      : `[${new Date().toISOString()}] Return filed - marked as COMPLETE`;

    await db
      .from('tax_intake_leads')
      .update({
        convertedToClient: true,
        convertedAt: new Date().toISOString(),
        contactNotes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Create lead activity
    await db.from('lead_activities').insert({
      leadId,
      type: 'STATUS_CHANGED',
      description: 'Lead marked as COMPLETE - tax return filed',
      metadata: {
        previousStatus: 'IN_PROGRESS',
        newStatus: 'COMPLETE',
        commissionCredited: !!commissionResult,
        commissionAmount: commissionResult?.amount || 0,
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
    return NextResponse.json({ error: 'Failed to complete lead' }, { status: 500 });
  }
}
