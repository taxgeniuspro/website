import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

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
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can share forms
    if (
      profile.role !== 'TAX_PREPARER' &&
      profile.role !== 'ADMIN' &&
      profile.role !== 'SUPER_ADMIN'
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

        return prisma.taxFormShare.create({
          data: {
            taxFormId: formId,
            sharedBy: profile.id,
            sharedWith: recipientEmail || 'public',
            shareToken,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
          },
          include: {
            taxForm: {
              select: {
                formNumber: true,
                title: true,
                fileName: true,
              },
            },
          },
        });
      })
    );

    logger.info(`Tax forms shared: ${formIds.length} forms by ${userId}`);

    // Return share information
    return NextResponse.json({
      shares: shares.map((share) => ({
        id: share.id,
        formNumber: share.taxForm.formNumber,
        formTitle: share.taxForm.title,
        shareToken: share.shareToken,
        shareUrl: `${request.nextUrl.origin}/tax-forms/shared/${share.shareToken}`,
        expiresAt: share.expiresAt,
      })),
    });
  } catch (error) {
    logger.error('Error creating tax form shares:', error);
    return NextResponse.json({ error: 'Failed to create shares' }, { status: 500 });
  }
}
