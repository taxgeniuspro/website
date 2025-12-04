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
import { prisma } from '@/lib/prisma';
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
    const session = await auth(); const user = session?.user;

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

    // Find user profile
    const profile = await prisma.profile.findFirst({
      where: {
        user: {
          email: user.emailAddresses[0]?.emailAddress,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the tax return
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
        documents: true,
      },
    });

    if (!taxReturn) {
      return NextResponse.json({ error: 'Tax return not found' }, { status: 404 });
    }

    // Authorization check
    // Only preparers assigned to this client or admins can update status
    let isAuthorized = false;

    if (profile.role === 'ADMIN') {
      isAuthorized = true;
    } else if (profile.role === 'PREPARER') {
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          preparerId: profile.id,
          clientId: taxReturn.profileId,
          isActive: true,
        },
      });
      if (assignment) {
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
    const updatedReturn = await prisma.taxReturn.update({
      where: { id },
      data: {
        status,
        ...(refundAmount !== undefined && { refundAmount }),
        ...(oweAmount !== undefined && { oweAmount }),
        ...(filedDate && { filedDate: new Date(filedDate) }),
      },
      include: {
        profile: {
          include: {
            user: true,
          },
        },
        documents: true,
      },
    });

    // Get client information for emails
    const clientEmail = taxReturn.profile.user.email;
    const clientName = taxReturn.profile.firstName
      ? `${taxReturn.profile.firstName} ${taxReturn.profile.lastName || ''}`?.trim()
      : 'Valued Client';

    // Get preparer information
    const preparerAssignment = await prisma.clientPreparer.findFirst({
      where: {
        clientId: taxReturn.profileId,
        isActive: true,
      },
      include: {
        preparer: {
          include: {
            user: true,
          },
        },
      },
    });

    const preparerName = preparerAssignment?.preparer.firstName
      ? `${preparerAssignment.preparer.firstName} ${preparerAssignment.preparer.lastName || ''}`?.trim()
      : 'Your Tax Preparer';
    const preparerEmail = preparerAssignment?.preparer.user.email || 'support@taxgeniuspro.tax';

    // Email automation triggers based on status transitions
    const emailsSent: string[] = [];

    // DRAFT → IN_REVIEW: Send "Documents Received" email
    if (oldStatus === 'DRAFT' && status === 'IN_REVIEW') {
      const documentCount = taxReturn.documents.length;

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
      const referral = await prisma.referral.findFirst({
        where: {
          clientId: taxReturn.profileId,
          status: { in: ['PENDING', 'ACTIVE'] },
        },
        include: {
          referrer: {
            include: {
              user: true,
            },
          },
        },
      });

      if (referral) {
        // Calculate commission based on package type
        const commissionAmount = calculateCommissionAmount(taxReturn.packageType || 'BASIC');

        // Create commission record
        const commission = await prisma.commission.create({
          data: {
            referrerId: referral.referrerId,
            referralId: referral.id,
            amount: commissionAmount,
            status: 'PENDING',
          },
        });

        // Update referral status to COMPLETED
        await prisma.referral.update({
          where: { id: referral.id },
          data: {
            status: 'COMPLETED',
            returnFiledDate: new Date(),
            commissionEarned: commissionAmount,
          },
        });

        // Get updated pending balance for email
        const pendingCommissions = await prisma.commission.findMany({
          where: {
            referrerId: referral.referrerId,
            status: 'PENDING',
          },
        });

        const pendingBalance = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);

        // Send commission earned email
        const referrerName = referral.referrer.firstName
          ? `${referral.referrer.firstName} ${referral.referrer.lastName || ''}`.trim()
          : 'Referrer';

        const commissionEmailSuccess = await EmailService.sendCommissionEarnedEmail(
          referral.referrer.user.email,
          referrerName,
          clientName,
          Number(commissionAmount),
          pendingBalance
        );

        if (commissionEmailSuccess) {
          emailsSent.push('commission-earned');
        }

        logger.info(
          `✅ Commission created: $${commissionAmount} for referrer ${referral.referrerId}`
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
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find user profile
    const profile = await prisma.profile.findFirst({
      where: {
        user: {
          email: user.emailAddresses[0]?.emailAddress,
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the tax return
    const taxReturn = await prisma.taxReturn.findUnique({
      where: { id },
      select: {
        id: true,
        profileId: true,
        status: true,
        taxYear: true,
        refundAmount: true,
        oweAmount: true,
        filedDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

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
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          preparerId: profile.id,
          clientId: taxReturn.profileId,
          isActive: true,
        },
      });
      if (assignment) {
        isAuthorized = true;
      }
    }

    // Admin can view
    if (profile.role === 'ADMIN') {
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
