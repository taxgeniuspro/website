/**
 * Tax Return Status Update API
 *
 * PATCH /api/submissions/[id]/status
 * Updates the status of a tax return and triggers automated emails
 *
 * Epic 3 - Stories 3.4 & 3.5
 * - Story 3.4: Silent Partner Email Automation
 * - Story 3.5: Post-Filing Referral Invitation
 *
 * Epic 5 - Story 5.2
 * - Story 5.2: Commission Automation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { EmailService } from '@/lib/services/email.service';
import { logger } from '@/lib/logger';

/**
 * Calculate commission amount based on tax package type
 * Rates can be configured via environment variables
 */
function calculateCommissionAmount(packageType: string): number {
  const rates: Record<string, number> = {
    BASIC: Number(process.env.COMMISSION_RATE_BASIC) || 25,
    STANDARD: Number(process.env.COMMISSION_RATE_STANDARD) || 35,
    PREMIUM: Number(process.env.COMMISSION_RATE_PREMIUM) || 50,
    DELUXE: Number(process.env.COMMISSION_RATE_DELUXE) || 75,
  };

  return rates[packageType.toUpperCase()] || 25; // Default to $25
}

/**
 * Update tax return status
 * Triggers email automation based on status transitions:
 * - DRAFT → IN_REVIEW: Send "Documents Received" email
 * - IN_REVIEW → FILED: Send "Return Filed" + "Referral Invitation" emails + Commission Creation
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the return ID from params
    const { id } = await params;

    // Parse request body
    const body = await req.json();
    const { status, refundAmount, oweAmount, filedDate } = body;

    // Validate status
    const validStatuses = ['DRAFT', 'IN_REVIEW', 'FILED', 'COMPLETED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: DRAFT, IN_REVIEW, FILED, COMPLETED' },
        { status: 400 }
      );
    }

    // Find user profile using session user ID
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the tax return
    const { data: taxReturn } = await db
      .from('tax_returns')
      .select('*')
      .eq('id', id)
      .single();

    if (!taxReturn) {
      return NextResponse.json({ error: 'Tax return not found' }, { status: 404 });
    }

    // Get the profile and user for this tax return
    const { data: taxReturnProfile } = await db
      .from('profiles')
      .select('*, userId')
      .eq('id', taxReturn.profileId)
      .single();

    const { data: taxReturnUser } = await db
      .from('users')
      .select('email')
      .eq('id', taxReturnProfile?.userId)
      .single();

    // Get documents for this tax return
    const { data: documents } = await db
      .from('documents')
      .select('*')
      .eq('taxReturnId', id);

    // Authorization check
    // Only preparers assigned to this client or admins can update status
    let isAuthorized = false;

    if (profile.role === 'admin') {
      isAuthorized = true;
    } else if (profile.role === 'PREPARER') {
      const { data: assignments } = await db
        .from('client_preparers')
        .select('id')
        .eq('preparerId', profile.id)
        .eq('clientId', taxReturn.profileId)
        .eq('isActive', true)
        .limit(1);

      if (assignments && assignments.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to update this tax return' },
        { status: 403 }
      );
    }

    // Store old status for email triggers
    const oldStatus = taxReturn.status;

    // Update the tax return
    const updateData: any = { status };
    if (refundAmount !== undefined) updateData.refundAmount = refundAmount;
    if (oweAmount !== undefined) updateData.oweAmount = oweAmount;
    if (filedDate) updateData.filedDate = new Date(filedDate).toISOString();

    const { data: updatedReturn, error: updateError } = await db
      .from('tax_returns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Get client information for emails
    const clientEmail = taxReturnUser?.email || '';
    const clientName = taxReturnProfile?.firstName
      ? `${taxReturnProfile.firstName} ${taxReturnProfile.lastName || ''}`.trim()
      : 'Valued Client';

    // Get preparer information
    const { data: preparerAssignments } = await db
      .from('client_preparers')
      .select('preparerId')
      .eq('clientId', taxReturn.profileId)
      .eq('isActive', true)
      .limit(1);

    const preparerAssignment = firstOrNull(preparerAssignments);

    let preparerName = 'Your Tax Preparer';
    let preparerEmail = 'support@taxgeniuspro.tax';

    if (preparerAssignment) {
      const { data: preparerProfile } = await db
        .from('profiles')
        .select('firstName, lastName, userId')
        .eq('id', preparerAssignment.preparerId)
        .single();

      if (preparerProfile) {
        preparerName = `${preparerProfile.firstName || ''} ${preparerProfile.lastName || ''}`.trim() || 'Your Tax Preparer';
        const { data: preparerUser } = await db
          .from('users')
          .select('email')
          .eq('id', preparerProfile.userId)
          .single();
        preparerEmail = preparerUser?.email || 'support@taxgeniuspro.tax';
      }
    }

    // Email automation triggers based on status transitions
    const emailsSent: string[] = [];

    // DRAFT → IN_REVIEW: Send "Documents Received" email
    if (oldStatus === 'DRAFT' && status === 'IN_REVIEW') {
      const documentCount = (documents || []).length;

      const success = await EmailService.sendDocumentsReceivedEmail(
        clientEmail,
        clientName,
        preparerName,
        preparerEmail,
        taxReturn.taxYear,
        documentCount
      );

      if (success) {
        emailsSent.push('documents-received');
      }
    }

    // IN_REVIEW → FILED: Send "Return Filed" + "Referral Invitation" emails
    if (oldStatus === 'IN_REVIEW' && status === 'FILED') {
      // Send "Return Filed" email
      const returnFiledSuccess = await EmailService.sendReturnFiledEmail(
        clientEmail,
        clientName,
        preparerName,
        taxReturn.taxYear,
        refundAmount,
        oweAmount,
        filedDate
      );

      if (returnFiledSuccess) {
        emailsSent.push('return-filed');
      }

      // Send "Referral Invitation" email (Story 3.5)
      const referralSuccess = await EmailService.sendReferralInvitationEmail(
        clientEmail,
        clientName,
        preparerName,
        taxReturn.taxYear,
        refundAmount
      );

      if (referralSuccess) {
        emailsSent.push('referral-invitation');
      }

      // === EPIC 5 - STORY 5.2: COMMISSION AUTOMATION ===
      // When return is filed, create commission for referrer if applicable
      const { data: referrals } = await db
        .from('referrals')
        .select('*')
        .eq('clientId', taxReturn.profileId)
        .in('status', ['PENDING', 'ACTIVE'])
        .limit(1);

      const referral = firstOrNull(referrals);

      if (referral) {
        // Get referrer info
        const { data: referrerProfile } = await db
          .from('profiles')
          .select('firstName, lastName, userId')
          .eq('id', referral.referrerId)
          .single();

        const { data: referrerUser } = await db
          .from('users')
          .select('email')
          .eq('id', referrerProfile?.userId)
          .single();

        // Calculate commission based on package type
        const commissionAmount = calculateCommissionAmount(taxReturn.packageType || 'BASIC');

        // Create commission record
        await db
          .from('commissions')
          .insert({
            referrerId: referral.referrerId,
            referralId: referral.id,
            amount: commissionAmount,
            status: 'PENDING',
          });

        // Update referral status to COMPLETED
        await db
          .from('referrals')
          .update({
            status: 'COMPLETED',
            returnFiledDate: new Date().toISOString(),
            commissionEarned: commissionAmount,
          })
          .eq('id', referral.id);

        // Get updated pending balance for email
        const { data: pendingCommissions } = await db
          .from('commissions')
          .select('amount')
          .eq('referrerId', referral.referrerId)
          .eq('status', 'PENDING');

        const pendingBalance = (pendingCommissions || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0);

        // Send commission earned email
        const referrerName = referrerProfile?.firstName
          ? `${referrerProfile.firstName} ${referrerProfile.lastName || ''}`.trim()
          : 'Referrer';

        const commissionEmailSuccess = await EmailService.sendCommissionEarnedEmail(
          referrerUser?.email || '',
          referrerName,
          clientName,
          Number(commissionAmount),
          pendingBalance
        );

        if (commissionEmailSuccess) {
          emailsSent.push('commission-earned');
        }

        logger.info(
          `Commission created: $${commissionAmount} for referrer ${referral.referrerId}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      taxReturn: updatedReturn,
      emailsSent,
      message: `Status updated from ${oldStatus} to ${status}`,
    });
  } catch (error) {
    logger.error('Error updating tax return status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get current status of a tax return
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find user profile using session user ID
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', user.id)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the tax return
    const { data: taxReturn } = await db
      .from('tax_returns')
      .select('id, profileId, status, taxYear, refundAmount, oweAmount, filedDate, createdAt, updatedAt')
      .eq('id', id)
      .single();

    if (!taxReturn) {
      return NextResponse.json({ error: 'Tax return not found' }, { status: 404 });
    }

    // Authorization check
    let isAuthorized = false;

    // Owner can view
    if (taxReturn.profileId === profile.id) {
      isAuthorized = true;
    }

    // Assigned preparer can view
    if (profile.role === 'PREPARER') {
      const { data: assignments } = await db
        .from('client_preparers')
        .select('id')
        .eq('preparerId', profile.id)
        .eq('clientId', taxReturn.profileId)
        .eq('isActive', true)
        .limit(1);

      if (assignments && assignments.length > 0) {
        isAuthorized = true;
      }
    }

    // Admin can view
    if (profile.role === 'admin') {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Not authorized to view this tax return' },
        { status: 403 }
      );
    }

    return NextResponse.json({ taxReturn });
  } catch (error) {
    logger.error('Error fetching tax return status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
