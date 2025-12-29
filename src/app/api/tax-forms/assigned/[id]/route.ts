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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
}

interface TaxForm {
  formNumber: string;
  title: string;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
  status: string;
  progress: number;
  notes: string | null;
  formData: Record<string, unknown> | null;
  lastEditedAt: string | null;
  completedAt: string | null;
  reviewedAt: string | null;
}

/**
 * PATCH - Update form data or status
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Get the assignment
    const { data: assignmentData } = await db
      .from('client_tax_forms')
      .select('*')
      .eq('id', id)
      .limit(1);

    const assignment = firstOrNull<ClientTaxForm>(assignmentData);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;
    let isClient = false;

    // Client can edit their own forms
    if (assignment.clientId === profile.id && ['client', 'lead'].includes(profile.role)) {
      hasAccess = true;
      isClient = true;
    }
    // Admin can edit any form
    else if (['admin', 'admin'].includes(profile.role)) {
      hasAccess = true;
    }
    // Tax preparer can edit if they're assigned to this client
    else if (profile.role === 'tax_preparer') {
      const { data: clientAssignmentData } = await db
        .from('client_preparers')
        .select('clientId, preparerId')
        .eq('clientId', assignment.clientId)
        .eq('preparerId', profile.id)
        .limit(1);

      if (clientAssignmentData && clientAssignmentData.length > 0) {
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
    const updateData: Record<string, unknown> = {
      lastEditedBy: profile.id,
      lastEditedAt: new Date().toISOString(),
    };

    if (formData) {
      updateData.formData = newFormData;

      // If client is starting to fill the form, update status
      if (isClient && assignment.status === 'ASSIGNED' && Object.keys(fieldChanges).length > 0) {
        updateData.status = 'IN_PROGRESS';
        updateData.startedAt = new Date().toISOString();
      }
    }

    if (status) {
      updateData.status = status;

      // Track completion time
      if (status === 'COMPLETED' && !assignment.completedAt) {
        updateData.completedAt = new Date().toISOString();
      }

      // Track review time
      if (status === 'REVIEWED' && !assignment.reviewedAt) {
        updateData.reviewedAt = new Date().toISOString();
        updateData.reviewedBy = reviewedBy || profile.id;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: updatedData, error: updateError } = await db
      .from('client_tax_forms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating assignment:', updateError);
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    // Get tax form details
    const { data: taxFormData } = await db
      .from('tax_forms')
      .select('formNumber, title')
      .eq('id', updatedData.taxFormId)
      .limit(1);

    const taxForm = firstOrNull<TaxForm>(taxFormData);

    // Create edit history record if there were field changes
    if (Object.keys(fieldChanges).length > 0) {
      await db
        .from('tax_form_edits')
        .insert({
          clientTaxFormId: id,
          editedBy: profile.id,
          editedByRole: profile.role,
          fieldChanges,
          formDataSnapshot: newFormData,
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
        id: updatedData.id,
        status: updatedData.status,
        progress: updatedData.progress,
        formData: updatedData.formData,
        notes: updatedData.notes,
        lastEditedAt: updatedData.lastEditedAt,
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

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

    // Only tax preparers and admins can unassign forms
    if (!['tax_preparer', 'admin', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only tax preparers and admins can unassign forms' },
        { status: 403 }
      );
    }

    // Get the assignment
    const { data: assignmentData } = await db
      .from('client_tax_forms')
      .select('id, clientId')
      .eq('id', id)
      .limit(1);

    const assignment = firstOrNull<ClientTaxForm>(assignmentData);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // For tax preparers, verify they have access to this client
    if (profile.role === 'tax_preparer') {
      const { data: clientAssignmentData } = await db
        .from('client_preparers')
        .select('clientId, preparerId')
        .eq('clientId', assignment.clientId)
        .eq('preparerId', profile.id)
        .limit(1);

      if (!clientAssignmentData || clientAssignmentData.length === 0) {
        return NextResponse.json(
          { error: 'You do not have access to this client' },
          { status: 403 }
        );
      }
    }

    // Delete the assignment (cascade will delete edit history)
    const { error: deleteError } = await db
      .from('client_tax_forms')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting assignment:', deleteError);
      return NextResponse.json({ error: 'Failed to unassign form' }, { status: 500 });
    }

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
