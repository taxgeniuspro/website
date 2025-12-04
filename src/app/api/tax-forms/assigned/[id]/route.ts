/**
 * Client Tax Form Update API
 *
 * PATCH /api/tax-forms/assigned/[id]
 * Update form data, status, or notes for an assigned tax form
 *
 * DELETE /api/tax-forms/assigned/[id]
 * Unassign a tax form from a client (Tax Preparer or Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * PATCH - Update form data or status
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get the assignment
    const assignment = await prisma.clientTaxForm.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;
    let isClient = false;

    // Client can edit their own forms
    if (assignment.clientId === profile.id && ['CLIENT', 'LEAD'].includes(profile.role)) {
      hasAccess = true;
      isClient = true;
    }
    // Admin can edit any form
    else if (['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      hasAccess = true;
    }
    // Tax preparer can edit if they're assigned to this client
    else if (profile.role === 'TAX_PREPARER') {
      const clientAssignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId: assignment.clientId,
          preparerId: profile.id,
        },
      });

      if (clientAssignment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { formData, status, notes, reviewedBy } = body;

    // Track field changes for audit trail
    const oldFormData = (assignment.formData || {}) as Record<string, unknown>;
    const newFormData = formData ? { ...oldFormData, ...formData } : oldFormData;

    // Calculate field changes
    const fieldChanges: Record<string, { old: unknown; new: unknown }> = {};
    if (formData) {
      Object.keys(formData).forEach((key) => {
        if (JSON.stringify(oldFormData[key]) !== JSON.stringify(formData[key])) {
          fieldChanges[key] = {
            old: oldFormData[key],
            new: formData[key],
          };
        }
      });
    }

    // Update the assignment
    const updateData: any = {
      lastEditedBy: profile.id,
      lastEditedAt: new Date(),
    };

    if (formData) {
      updateData.formData = newFormData;

      // If client is starting to fill the form, update status
      if (isClient && assignment.status === 'ASSIGNED' && Object.keys(fieldChanges).length > 0) {
        updateData.status = 'IN_PROGRESS';
        updateData.startedAt = new Date();
      }
    }

    if (status) {
      updateData.status = status;

      // Track completion time
      if (status === 'COMPLETED' && !assignment.completedAt) {
        updateData.completedAt = new Date();
      }

      // Track review time
      if (status === 'REVIEWED' && !assignment.reviewedAt) {
        updateData.reviewedAt = new Date();
        updateData.reviewedBy = reviewedBy || profile.id;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const updated = await prisma.clientTaxForm.update({
      where: { id },
      data: updateData,
      include: {
        taxForm: {
          select: {
            formNumber: true,
            title: true,
          },
        },
      },
    });

    // Create edit history record if there were field changes
    if (Object.keys(fieldChanges).length > 0) {
      await prisma.taxFormEdit.create({
        data: {
          clientTaxFormId: id,
          editedBy: profile.id,
          editedByRole: profile.role,
          fieldChanges,
          formDataSnapshot: newFormData,
        },
      });

      logger.info('Tax form edited', {
        clientTaxFormId: id,
        editedBy: profile.id,
        changedFields: Object.keys(fieldChanges),
      });
    }

    return NextResponse.json({
      success: true,
      assignment: {
        id: updated.id,
        status: updated.status,
        progress: updated.progress,
        formData: updated.formData,
        notes: updated.notes,
        lastEditedAt: updated.lastEditedAt?.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error updating tax form assignment', { error });
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

/**
 * DELETE - Unassign a tax form (Tax Preparer or Admin only)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can unassign forms
    if (!['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only tax preparers and admins can unassign forms' },
        { status: 403 }
      );
    }

    // Get the assignment
    const assignment = await prisma.clientTaxForm.findUnique({
      where: { id },
      select: { clientId: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // For tax preparers, verify they have access to this client
    if (profile.role === 'TAX_PREPARER') {
      const clientAssignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId: assignment.clientId,
          preparerId: profile.id,
        },
      });

      if (!clientAssignment) {
        return NextResponse.json(
          { error: 'You do not have access to this client' },
          { status: 403 }
        );
      }
    }

    // Delete the assignment (cascade will delete edit history)
    await prisma.clientTaxForm.delete({
      where: { id },
    });

    logger.info('Tax form unassigned', {
      clientTaxFormId: id,
      unassignedBy: profile.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error unassigning tax form', { error });
    return NextResponse.json({ error: 'Failed to unassign form' }, { status: 500 });
  }
}
