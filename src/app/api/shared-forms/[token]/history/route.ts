import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces (replacing Prisma types)
interface TaxFormEdit {
  id: string;
  clientTaxFormId: string;
  editedBy: string;
  editedByRole: string;
  fieldChanges: any;
  editNote?: string | null;
  formDataSnapshot: any;
  editedAt: Date;
}

/**
 * GET /api/shared-forms/[token]/history
 * Get version history/audit trail for a form
 * Shows all edits with who made them and when
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentUserProfile } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .single();

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get share record
    const { data: share } = await db
      .from('tax_form_shares')
      .select('taxFormId, sharedWith')
      .eq('shareToken', resolvedParams.token)
      .single();

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Get client tax form
    const { data: clientTaxForms } = await db
      .from('client_tax_forms')
      .select('id, clientId, assignedBy')
      .eq('taxFormId', share.taxFormId)
      .eq('clientId', share.sharedWith)
      .limit(1);

    const clientTaxForm = firstOrNull(clientTaxForms);

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Check permissions
    const canView =
      currentUserProfile.id === clientTaxForm.clientId ||
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin';

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to view this form history' }, { status: 403 });
    }

    // Get edit history
    const { data: edits } = await db
      .from('tax_form_edits')
      .select('*')
      .eq('clientTaxFormId', clientTaxForm.id)
      .order('editedAt', { ascending: false });

    // Get profile info for each editor
    const editorIds = [...new Set((edits || []).map((e: any) => e.editedBy))];
    const { data: editors } = await db
      .from('profiles')
      .select('id, firstName, lastName')
      .in('id', editorIds);

    const editorMap = new Map((editors || []).map((e: any) => [e.id, e]));

    const history = (edits || []).map((edit: any) => {
      const editor = editorMap.get(edit.editedBy);
      return {
        id: edit.id,
        editedBy: {
          id: edit.editedBy,
          name: editor ? `${editor.firstName || ''} ${editor.lastName || ''}`.trim() : 'Unknown',
          role: edit.editedByRole,
        },
        fieldChanges: edit.fieldChanges,
        editNote: edit.editNote,
        editedAt: edit.editedAt,
      };
    });

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
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentUserProfile } = await db
      .from('profiles')
      .select('id, role')
      .eq('userId', userId)
      .single();

    if (!currentUserProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get share record
    const { data: share } = await db
      .from('tax_form_shares')
      .select('taxFormId, sharedWith')
      .eq('shareToken', resolvedParams.token)
      .single();

    if (!share) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    // Get client tax form
    const { data: clientTaxForms } = await db
      .from('client_tax_forms')
      .select('id, clientId, assignedBy, status, formData')
      .eq('taxFormId', share.taxFormId)
      .eq('clientId', share.sharedWith)
      .limit(1);

    const clientTaxForm = firstOrNull(clientTaxForms);

    if (!clientTaxForm) {
      return NextResponse.json({ error: 'Form assignment not found' }, { status: 404 });
    }

    // Only preparer or admin can revert
    const canRevert =
      currentUserProfile.id === clientTaxForm.assignedBy ||
      currentUserProfile.role === 'admin';

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
    const { data: targetEdit } = await db
      .from('tax_form_edits')
      .select('formDataSnapshot, clientTaxFormId')
      .eq('id', editId)
      .single();

    if (!targetEdit || targetEdit.clientTaxFormId !== clientTaxForm.id) {
      return NextResponse.json({ error: 'Edit not found or does not belong to this form' }, { status: 404 });
    }

    // Revert to the snapshot
    const { data: updated } = await db
      .from('client_tax_forms')
      .update({
        formData: targetEdit.formDataSnapshot,
        lastEditedBy: currentUserProfile.id,
        lastEditedAt: new Date().toISOString(),
      })
      .eq('id', clientTaxForm.id)
      .select()
      .single();

    // Create audit trail entry for the revert
    await db
      .from('tax_form_edits')
      .insert({
        clientTaxFormId: clientTaxForm.id,
        editedBy: currentUserProfile.id,
        editedByRole: currentUserProfile.role,
        fieldChanges: {}, // No specific field changes, just a revert
        formDataSnapshot: targetEdit.formDataSnapshot,
        editNote: `Reverted to previous version`,
      });

    logger.info(`Form reverted: ${clientTaxForm.id} to edit ${editId}`);

    return NextResponse.json({
      success: true,
      formData: updated?.formData,
    });
  } catch (error) {
    logger.error('Error reverting form:', error);
    return NextResponse.json({ error: 'Failed to revert form' }, { status: 500 });
  }
}
