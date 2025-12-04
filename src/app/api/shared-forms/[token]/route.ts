import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/shared-forms/[token]
 * Fetch form data by share token
 * Public endpoint - accessible with valid token
 * Records first access time and updates access count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    // Get share record
    const share = await prisma.taxFormShare.findUnique({
      where: { shareToken: params.token },
      include: {
        taxForm: {
          include: {
            fieldDefinitions: {
              orderBy: [{ section: 'asc' }, { order: 'asc' }],
            },
          },
        },
      },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Get client tax form data
    const clientTaxForm = await prisma.clientTaxForm.findFirst({
      where: {
        taxFormId: share.taxFormId,
        clientId: share.sharedWith,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            userId: true,
          },
        },
        assignedByProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
          },
        },
        signatures: {
          orderBy: { signedAt: 'desc' },
          select: {
            id: true,
            signedBy: true,
            signedByRole: true,
            signatureType: true,
            signedAt: true,
          },
        },
      },
    });

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Get current user's profile if authenticated
    let currentUserProfile = null;
    if (userId) {
      currentUserProfile = await prisma.profile.findUnique({
        where: { userId },
        select: { id: true, role: true },
      });
    }

    // Check permissions
    const canEdit =
      currentUserProfile?.id === clientTaxForm.clientId || // Client who was assigned
      currentUserProfile?.id === clientTaxForm.assignedBy || // Preparer who assigned
      currentUserProfile?.role === 'admin' || // Admin
      currentUserProfile?.role === 'super_admin'; // Super admin

    // Update access tracking on first access
    if (share.accessCount === 0) {
      await prisma.taxFormShare.update({
        where: { id: share.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessAt: new Date(),
        },
      });

      // Update startedAt on client tax form if first access
      if (!clientTaxForm.startedAt) {
        await prisma.clientTaxForm.update({
          where: { id: clientTaxForm.id },
          data: { startedAt: new Date() },
        });
      }

      logger.info(`Form share first accessed: ${params.token}`);
    } else {
      // Just increment counter
      await prisma.taxFormShare.update({
        where: { id: share.id },
        data: {
          accessCount: { increment: 1 },
          lastAccessAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      clientTaxForm: {
        id: clientTaxForm.id,
        status: clientTaxForm.status,
        formData: clientTaxForm.formData,
        notes: clientTaxForm.notes,
        progress: clientTaxForm.progress,
        taxYear: clientTaxForm.taxYear,
        lastEditedAt: clientTaxForm.lastEditedAt,
        lastEditedBy: clientTaxForm.lastEditedBy,
        isLocked: clientTaxForm.status === 'REVIEWED', // Locked after review
      },
      taxForm: {
        id: share.taxForm.id,
        formNumber: share.taxForm.formNumber,
        title: share.taxForm.title,
        description: share.taxForm.description,
        category: share.taxForm.category,
        taxYear: share.taxForm.taxYear,
        fieldDefinitions: share.taxForm.fieldDefinitions,
      },
      client: {
        id: clientTaxForm.client.id,
        name: `${clientTaxForm.client.firstName} ${clientTaxForm.client.lastName}`,
      },
      preparer: {
        id: clientTaxForm.assignedByProfile.id,
        name: `${clientTaxForm.assignedByProfile.firstName} ${clientTaxForm.assignedByProfile.lastName}`,
        company: clientTaxForm.assignedByProfile.companyName,
      },
      signatures: clientTaxForm.signatures,
      permissions: {
        canEdit,
        canSign: canEdit && clientTaxForm.status !== 'REVIEWED',
      },
    });
  } catch (error) {
    logger.error('Error fetching shared form:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

/**
 * PATCH /api/shared-forms/[token]
 * Save form edits (auto-save)
 * Body:
 * - formData: object - Updated form data
 * - progress?: number - Form completion percentage (0-100)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const currentUserProfile = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true, role: true },
    });

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get share record
    const share = await prisma.taxFormShare.findUnique({
      where: { shareToken: params.token },
      select: { id: true, taxFormId: true, sharedWith: true, expiresAt: true },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Check if expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 });
    }

    // Get client tax form
    const clientTaxForm = await prisma.clientTaxForm.findFirst({
      where: {
        taxFormId: share.taxFormId,
        clientId: share.sharedWith,
      },
      select: {
        id: true,
        clientId: true,
        assignedBy: true,
        status: true,
        formData: true,
      },
    });

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Check permissions
    const canEdit =
      currentUserProfile.id === clientTaxForm.clientId ||
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin' ||
      currentUserProfile.role === 'super_admin';

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this form' }, { status: 403 });
    }

    // Check if form is locked
    if (clientTaxForm.status === 'REVIEWED') {
      return NextResponse.json({ error: 'Form is locked after review' }, { status: 423 });
    }

    const body = await request.json();
    const { formData, progress } = body;

    if (!formData) {
      return NextResponse.json({ error: 'Missing formData' }, { status: 400 });
    }

    // Detect field changes for audit trail
    const oldFormData = (clientTaxForm.formData as any) || {};
    const fieldChanges: any = {};

    for (const [key, newValue] of Object.entries(formData)) {
      const oldValue = oldFormData[key];
      if (oldValue !== newValue) {
        fieldChanges[key] = { old: oldValue, new: newValue };
      }
    }

    // Update client tax form
    const updated = await prisma.clientTaxForm.update({
      where: { id: clientTaxForm.id },
      data: {
        formData,
        progress: progress !== undefined ? progress : undefined,
        lastEditedBy: currentUserProfile.id,
        lastEditedAt: new Date(),
        status: clientTaxForm.status === 'ASSIGNED' ? 'IN_PROGRESS' : clientTaxForm.status,
      },
    });

    // Create audit trail entry if there are changes
    if (Object.keys(fieldChanges).length > 0) {
      await prisma.taxFormEdit.create({
        data: {
          clientTaxFormId: clientTaxForm.id,
          editedBy: currentUserProfile.id,
          editedByRole: currentUserProfile.role,
          fieldChanges,
          formDataSnapshot: formData,
        },
      });
    }

    logger.info(`Form updated: ${clientTaxForm.id} by ${currentUserProfile.id}`);

    return NextResponse.json({
      success: true,
      lastEditedAt: updated.lastEditedAt,
      progress: updated.progress,
      status: updated.status,
    });
  } catch (error) {
    logger.error('Error saving form:', error);
    return NextResponse.json({ error: 'Failed to save form' }, { status: 500 });
  }
}
