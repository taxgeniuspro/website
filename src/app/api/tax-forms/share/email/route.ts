import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { EmailService } from '@/lib/services/email.service';
import { randomBytes } from 'crypto';

/**
 * POST /api/tax-forms/share/email
 * Email tax forms to a client
 * Body:
 * - formIds: string[] - Array of tax form IDs to share
 * - recipientEmail: string - Email address of recipient
 * - recipientName?: string - Name of recipient
 * - message?: string - Optional custom message
 * - expiresAt?: Date - Optional expiration date for links
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can email forms
    if (
      profile.role !== 'TAX_PREPARER' &&
      profile.role !== 'ADMIN' &&
      profile.role !== 'SUPER_ADMIN'
    ) {
      return NextResponse.json(
        { error: 'Only tax preparers and admins can email forms' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { formIds, recipientEmail, recipientName, message, expiresAt } = body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json({ error: 'formIds must be a non-empty array' }, { status: 400 });
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'recipientEmail is required' }, { status: 400 });
    }

    // Verify all forms exist
    const forms = await prisma.taxForm.findMany({
      where: { id: { in: formIds } },
    });

    if (forms.length !== formIds.length) {
      return NextResponse.json({ error: 'One or more forms not found' }, { status: 404 });
    }

    // Create shares for each form
    const shares = await Promise.all(
      formIds.map(async (formId) => {
        const shareToken = randomBytes(32).toString('hex');

        const share = await prisma.taxFormShare.create({
          data: {
            taxFormId: formId,
            sharedBy: profile.id,
            sharedWith: recipientEmail,
            shareToken,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
          include: {
            taxForm: {
              select: {
                formNumber: true,
                title: true,
                description: true,
                fileName: true,
              },
            },
          },
        });

        return {
          formNumber: share.taxForm.formNumber,
          title: share.taxForm.title,
          description: share.taxForm.description,
          shareUrl: `${request.nextUrl.origin}/tax-forms/shared/${share.shareToken}`,
        };
      })
    );

    // Send email using Resend email service
    const senderName =
      `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Your Tax Preparer';

    try {
      const emailSent = await EmailService.sendTaxFormsEmail(
        recipientEmail,
        recipientName,
        senderName,
        shares.map((s) => ({
          formNumber: s.formNumber,
          title: s.title,
          description: s.description,
          shareUrl: s.shareUrl,
        })),
        message,
        expiresAt
      );

      if (!emailSent) {
        logger.warn(`Email failed to send to ${recipientEmail}, but shares were created`);
      }
    } catch (emailError) {
      logger.error('Error sending tax forms email:', emailError);
      // Don't fail the request if email fails - shares were still created
    }

    logger.info(`Tax forms emailed: ${formIds.length} forms to ${recipientEmail} by ${userId}`);

    return NextResponse.json({
      success: true,
      message: `${shares.length} form${shares.length > 1 ? 's' : ''} shared via email`,
      shares: shares.map((share) => ({
        formNumber: share.formNumber,
        title: share.title,
        shareUrl: share.shareUrl,
      })),
    });
  } catch (error) {
    logger.error('Error emailing tax forms:', error);
    return NextResponse.json({ error: 'Failed to email tax forms' }, { status: 500 });
  }
}
