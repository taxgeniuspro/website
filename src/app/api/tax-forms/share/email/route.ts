import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { EmailService } from '@/lib/services/email.service';
import { randomBytes } from 'crypto';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  description: string | null;
  fileName: string;
}

interface TaxFormShare {
  id: string;
  shareToken: string;
}

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
    const { data: profileData } = await db
      .from('profiles')
      .select('id, role, firstName, lastName')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can email forms
    if (
      profile.role !== 'tax_preparer' &&
      profile.role !== 'admin' &&
      profile.role !== 'admin'
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
    const { data: formsData, error: formsError } = await db
      .from('tax_forms')
      .select('id, formNumber, title, description, fileName')
      .in('id', formIds);

    if (formsError) {
      logger.error('Error fetching tax forms:', formsError);
      return NextResponse.json({ error: 'Failed to fetch tax forms' }, { status: 500 });
    }

    const forms = (formsData || []) as TaxForm[];

    if (forms.length !== formIds.length) {
      return NextResponse.json({ error: 'One or more forms not found' }, { status: 404 });
    }

    // Create shares for each form
    const shares = await Promise.all(
      formIds.map(async (formId) => {
        const shareToken = randomBytes(32).toString('hex');

        const { data: shareData, error: shareError } = await db
          .from('tax_form_shares')
          .insert({
            taxFormId: formId,
            sharedBy: profile.id,
            sharedWith: recipientEmail,
            shareToken,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          })
          .select('id, shareToken')
          .single();

        if (shareError) {
          logger.error('Error creating share:', shareError);
          throw new Error('Failed to create share');
        }

        const form = forms.find((f) => f.id === formId);

        return {
          formNumber: form?.formNumber || '',
          title: form?.title || '',
          description: form?.description || '',
          shareUrl: `${request.nextUrl.origin}/tax-forms/shared/${shareData.shareToken}`,
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
