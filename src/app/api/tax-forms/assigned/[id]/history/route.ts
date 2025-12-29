/**
 * Tax Form Edit History API
 *
 * GET /api/tax-forms/assigned/[id]/history
 * Get edit history for an assigned tax form (for collaboration tracking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces
interface Profile {
  id: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
}

interface ClientTaxForm {
  id: string;
  clientId: string;
}

interface TaxFormEdit {
  id: string;
  editedBy: string;
  editedByRole: string;
  fieldChanges: Record<string, { old: unknown; new: unknown }>;
  editNote: string | null;
  editedAt: string;
}

/**
 * GET - Get edit history for a form
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      .select('id, clientId')
      .eq('id', id)
      .limit(1);

    const assignment = firstOrNull<ClientTaxForm>(assignmentData);

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;

    // Client can view their own form history
    if (assignment.clientId === profile.id && ['client', 'lead'].includes(profile.role)) {
      hasAccess = true;
    }
    // Admin can view any history
    else if (['admin', 'admin'].includes(profile.role)) {
      hasAccess = true;
    }
    // Tax preparer can view if they're assigned to this client
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

    // Get edit history
    const { data: editsData, error: editsError } = await db
      .from('tax_form_edits')
      .select('id, editedBy, editedByRole, fieldChanges, editNote, editedAt')
      .eq('clientTaxFormId', id)
      .order('editedAt', { ascending: false });

    if (editsError) {
      logger.error('Error fetching edit history:', editsError);
      return NextResponse.json({ error: 'Failed to fetch edit history' }, { status: 500 });
    }

    // Get editor profiles
    const editorIds = [...new Set((editsData || []).map((e: any) => e.editedBy).filter(Boolean))];
    const { data: editorsData } = await db
      .from('profiles')
      .select('id, firstName, lastName, role')
      .in('id', editorIds);

    const editorsMap = new Map((editorsData || []).map((e: any) => [e.id, e]));

    return NextResponse.json({
      history: (editsData || []).map((edit: any) => {
        const editor = editorsMap.get(edit.editedBy);
        return {
          id: edit.id,
          editedBy: {
            name: editor ? `${editor.firstName || ''} ${editor.lastName || ''}`.trim() : 'Unknown',
            role: edit.editedByRole,
          },
          fieldChanges: edit.fieldChanges,
          editNote: edit.editNote,
          editedAt: edit.editedAt,
        };
      }),
    });
  } catch (error) {
    logger.error('Error fetching tax form edit history', { error });
    return NextResponse.json({ error: 'Failed to fetch edit history' }, { status: 500 });
  }
}
