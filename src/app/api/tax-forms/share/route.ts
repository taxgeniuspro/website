import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
}

interface TaxForm {
  id: string;
  formNumber: string;
  title: string;
  fileName: string;
}

interface TaxFormShare {
  id: string;
  shareToken: string;
  expiresAt: string | null;
}

/**
 * POST /api/tax-forms/share
 * Create shareable links for tax forms
 * Body:
 * - formIds: string[] - Array of tax form IDs to share
 * - recipientEmail?: string - Optional email address of recipient
 * - expiresAt?: Date - Optional expiration date
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
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can share forms
    if (
      profile.role !== 'tax_preparer' &&
      profile.role !== 'admin' &&
      profile.role !== 'admin'
    ) {
      return NextResponse.json(
        { error: 'Only tax preparers and admins can share forms' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { formIds, recipientEmail, expiresAt } = body;

    if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
      return NextResponse.json({ error: 'formIds must be a non-empty array' }, { status: 400 });
    }

    // Verify all forms exist
    const { data: formsData, error: formsError } = await db
      .from('tax_forms')
      .select('id, formNumber, title, fileName')
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
            sharedWith: recipientEmail || 'public',
            shareToken,
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          })
          .select('id, shareToken, expiresAt')
          .single();

        if (shareError) {
          logger.error('Error creating share:', shareError);
          throw new Error('Failed to create share');
        }

        const form = forms.find((f) => f.id === formId);

        return {
          id: shareData.id,
          formNumber: form?.formNumber || '',
          formTitle: form?.title || '',
          shareToken: shareData.shareToken,
          shareUrl: `${request.nextUrl.origin}/tax-forms/shared/${shareData.shareToken}`,
          expiresAt: shareData.expiresAt,
        };
      })
    );

    logger.info(`Tax forms shared: ${formIds.length} forms by ${userId}`);

    // Return share information
    return NextResponse.json({
      shares,
    });
  } catch (error) {
    logger.error('Error creating tax form shares:', error);
    return NextResponse.json({ error: 'Failed to create shares' }, { status: 500 });
  }
}
