/**
 * Tax Form Assignments Query API
 *
 * GET /api/tax-forms/assignments?formId={formId}
 * Get all assignments for a specific form (to check which clients have it)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    // Only tax preparers and admins can query assignments
    if (!['TAX_PREPARER', 'ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json({ error: 'Missing formId parameter' }, { status: 400 });
    }

    // Get all assignments for this form
    const assignments = await prisma.clientTaxForm.findMany({
      where: { taxFormId: formId },
      select: {
        id: true,
        clientId: true,
        status: true,
        assignedAt: true,
      },
    });

    // For tax preparers, filter to only their clients
    if (profile.role === 'TAX_PREPARER') {
      const preparerClients = await prisma.clientPreparer.findMany({
        where: { preparerId: profile.id },
        select: { clientId: true },
      });

      const clientIds = preparerClients.map((pc) => pc.clientId);

      return NextResponse.json({
        assignments: assignments.filter((a) => clientIds.includes(a.clientId)),
      });
    }

    // Admins can see all assignments
    return NextResponse.json({ assignments });
  } catch (error) {
    logger.error('Error fetching tax form assignments', { error });
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}
