import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/shared-forms/[token]/history
 * Get version history/audit trail for a form
 * Shows all edits with who made them and when
 */
export async function GET(
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
      select: { taxFormId: true, sharedWith: true },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
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
      },
    });

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Check permissions
    const canView =
      currentUserProfile.id === clientTaxForm.clientId ||
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin' ||
      currentUserProfile.role === 'super_admin';

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this form history' }, { status: 403 });
    }

    // Get edit history
    const edits = await prisma.taxFormEdit.findMany({
      where: { clientTaxFormId: clientTaxForm.id },
      include: {
        editedByProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { editedAt: 'desc' },
    });

    const history = edits.map((edit) => ({
      id: edit.id,
      editedBy: {
        id: edit.editedBy,
        name: `${edit.editedByProfile.firstName} ${edit.editedByProfile.lastName}`,
        role: edit.editedByRole,
      },
      fieldChanges: edit.fieldChanges,
      editNote: edit.editNote,
      editedAt: edit.editedAt,
    }));

    logger.info(`Form history retrieved: ${clientTaxForm.id}`);

    return NextResponse.json({
      success: true,
      history,
      totalEdits: history.length,
    });
  } catch (error) {
    logger.error('Error fetching form history:', error);
    return NextResponse.json({ error: 'Failed to fetch form history' }, { status: 500 });
  }
}

/**
 * POST /api/shared-forms/[token]/history
 * Revert to a previous version
 * Body:
 * - editId: string - ID of the edit to revert to
 */
export async function POST(
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
      select: { taxFormId: true, sharedWith: true },
    });

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
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

    // Only preparer or admin can revert
    const canRevert =
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin' ||
      currentUserProfile.role === 'super_admin';

    if (!canRevert) {
      return NextResponse.json({ error: 'Forbidden: Only the tax preparer can revert versions' }, { status: 403 });
    }

    // Check if form is locked
    if (clientTaxForm.status === 'REVIEWED') {
      return NextResponse.json({ error: 'Form is locked after review' }, { status: 423 });
    }

    const body = await request.json();
    const { editId } = body;

    if (!editId) {
      return NextResponse.json({ error: 'Missing editId' }, { status: 400 });
    }

    // Get the edit to revert to
    const targetEdit = await prisma.taxFormEdit.findUnique({
      where: { id: editId },
      select: { formDataSnapshot: true, clientTaxFormId: true },
    });

    if (!targetEdit || targetEdit.clientTaxFormId !== clientTaxForm.id) {
      return NextResponse.json({ error: 'Edit not found or does not belong to this form' }, { status: 404 });
    }

    // Revert to the snapshot
    const updated = await prisma.clientTaxForm.update({
      where: { id: clientTaxForm.id },
      data: {
        formData: targetEdit.formDataSnapshot,
        lastEditedBy: currentUserProfile.id,
        lastEditedAt: new Date(),
      },
    });

    // Create audit trail entry for the revert
    await prisma.taxFormEdit.create({
      data: {
        clientTaxFormId: clientTaxForm.id,
        editedBy: currentUserProfile.id,
        editedByRole: currentUserProfile.role,
        fieldChanges: {}, // No specific field changes, just a revert
        formDataSnapshot: targetEdit.formDataSnapshot,
        editNote: `Reverted to version from ${new Date(targetEdit.formDataSnapshot).toLocaleString()}`,
      },
    });

    logger.info(`Form reverted: ${clientTaxForm.id} to edit ${editId}`);

    return NextResponse.json({
      success: true,
      formData: updated.formData,
    });
  } catch (error) {
    logger.error('Error reverting form:', error);
    return NextResponse.json({ error: 'Failed to revert form' }, { status: 500 });
  }
}
