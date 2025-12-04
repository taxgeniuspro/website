/**
 * Tax Form Assignment API
 *
 * POST /api/tax-forms/assign
 * Assign a tax form to a client (Tax Preparer or Admin only)
 *
 * GET /api/tax-forms/assign?clientId={clientId}
 * Get all form assignments for a client (Tax Preparer or Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * POST - Assign a tax form to a client
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can assign forms
    if (!['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Only tax preparers and admins can assign forms' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clientId, taxFormId, notes } = body;

    if (!clientId || !taxFormId) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, taxFormId' },
        { status: 400 }
      );
    }

    // Verify client exists and has CLIENT or LEAD role
    const client = await prisma.profile.findUnique({
      where: { id: clientId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (!['CLIENT', 'LEAD'].includes(client.role)) {
      return NextResponse.json({ error: 'Target user must be a client or lead' }, { status: 400 });
    }

    // Verify tax form exists
    const taxForm = await prisma.taxForm.findUnique({
      where: { id: taxFormId },
      select: { id: true, formNumber: true, title: true, isActive: true },
    });

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    if (!taxForm.isActive) {
      return NextResponse.json({ error: 'Tax form is not active' }, { status: 400 });
    }

    // Check if form is already assigned
    const existing = await prisma.clientTaxForm.findUnique({
      where: {
        clientId_taxFormId: {
          clientId,
          taxFormId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Form is already assigned to this client' },
        { status: 409 }
      );
    }

    // For tax preparers, verify they have access to this client
    if (profile.role === 'TAX_PREPARER') {
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId,
          preparerId: profile.id,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'You do not have access to this client' },
          { status: 403 }
        );
      }
    }

    // Create the assignment
    const clientTaxForm = await prisma.clientTaxForm.create({
      data: {
        clientId,
        taxFormId,
        assignedBy: profile.id,
        notes,
        status: 'ASSIGNED',
      },
      include: {
        taxForm: {
          select: {
            formNumber: true,
            title: true,
            category: true,
            taxYear: true,
          },
        },
        client: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    logger.info('Tax form assigned to client', {
      clientTaxFormId: clientTaxForm.id,
      clientId,
      taxFormId,
      assignedBy: profile.id,
    });

    return NextResponse.json({
      success: true,
      assignment: clientTaxForm,
    });
  } catch (error) {
    logger.error('Error assigning tax form', { error });
    return NextResponse.json({ error: 'Failed to assign tax form' }, { status: 500 });
  }
}

/**
 * GET - Get all form assignments for a client
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only tax preparers and admins can view assignments
    if (!['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'Missing clientId parameter' }, { status: 400 });
    }

    // For tax preparers, verify they have access to this client
    if (profile.role === 'TAX_PREPARER') {
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId,
          preparerId: profile.id,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: 'You do not have access to this client' },
          { status: 403 }
        );
      }
    }

    // Get all assignments for this client
    const assignments = await prisma.clientTaxForm.findMany({
      where: { clientId },
      include: {
        taxForm: {
          select: {
            formNumber: true,
            title: true,
            category: true,
            taxYear: true,
            fileUrl: true,
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
        assignedAt: a.assignedAt.toISOString(),
        startedAt: a.startedAt?.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        lastEditedAt: a.lastEditedAt?.toISOString(),
        taxForm: a.taxForm,
        assignedBy: a.assignedByProfile,
      })),
    });
  } catch (error) {
    logger.error('Error fetching tax form assignments', { error });
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
