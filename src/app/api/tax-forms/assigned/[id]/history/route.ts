/**
 * Tax Form Edit History API
 *
 * GET /api/tax-forms/assigned/[id]/history
 * Get edit history for an assigned tax form (for collaboration tracking)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET - Get edit history for a form
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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
      select: { clientId: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify access
    let hasAccess = false;

    // Client can view their own form history
    if (assignment.clientId === profile.id && ['CLIENT', 'LEAD'].includes(profile.role)) {
      hasAccess = true;
    }
    // Admin can view any history
    else if (['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      hasAccess = true;
    }
    // Tax preparer can view if they're assigned to this client
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

    // Get edit history
    const edits = await prisma.taxFormEdit.findMany({
      where: { clientTaxFormId: id },
      include: {
        editedByProfile: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        editedAt: 'desc',
      },
    });

    return NextResponse.json({
      history: edits.map((edit) => ({
        id: edit.id,
        editedBy: {
          name: `${edit.editedByProfile.firstName || ''} ${edit.editedByProfile.lastName || ''}`.trim(),
          role: edit.editedByRole,
        },
        fieldChanges: edit.fieldChanges,
        editNote: edit.editNote,
        editedAt: edit.editedAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Error fetching tax form edit history', { error });
    return NextResponse.json({ error: 'Failed to fetch edit history' }, { status: 500 });
  }
}
