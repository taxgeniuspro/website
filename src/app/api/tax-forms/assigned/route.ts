/**
 * Client Tax Forms API
 *
 * GET /api/tax-forms/assigned
 * Get all tax forms assigned to the authenticated client
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET - Get all forms assigned to the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only clients and leads can access this endpoint
    if (!['CLIENT', 'LEAD'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - This endpoint is for clients only' },
        { status: 403 }
      );
    }

    // Get all forms assigned to this client
    const assignments = await prisma.clientTaxForm.findMany({
      where: { clientId: profile.id },
      include: {
        taxForm: {
          select: {
            id: true,
            formNumber: true,
            title: true,
            description: true,
            category: true,
            taxYear: true,
            fileUrl: true,
            fileName: true,
          },
        },
        assignedByProfile: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        status: a.status,
        progress: a.progress,
        notes: a.notes,
        formData: a.formData,
        assignedAt: a.assignedAt.toISOString(),
        startedAt: a.startedAt?.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        lastEditedAt: a.lastEditedAt?.toISOString(),
        taxForm: a.taxForm,
        assignedBy: {
          name: `${a.assignedByProfile.firstName || ''} ${a.assignedByProfile.lastName || ''}`.trim(),
        },
      })),
    });
  } catch (error) {
    logger.error('Error fetching assigned tax forms', { error });
    return NextResponse.json({ error: 'Failed to fetch assigned forms' }, { status: 500 });
  }
}
