import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/tax-forms/[id]
 * Get single tax form details
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const taxForm = await prisma.taxForm.findUnique({
      where: { id },
      include: {
        shares: {
          select: {
            id: true,
            sharedWith: true,
            shareToken: true,
            createdAt: true,
            accessCount: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!taxForm) {
      return NextResponse.json({ error: 'Tax form not found' }, { status: 404 });
    }

    return NextResponse.json(taxForm);
  } catch (error) {
    logger.error('Error fetching tax form:', error);
    return NextResponse.json({ error: 'Failed to fetch tax form' }, { status: 500 });
  }
}

/**
 * PATCH /api/tax-forms/[id]
 * Update tax form (Admin only)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { role: true },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const taxForm = await prisma.taxForm.update({
      where: { id },
      data: body,
    });

    logger.info(`Tax form updated: ${taxForm.formNumber} by ${userId}`);

    return NextResponse.json(taxForm);
  } catch (error) {
    logger.error('Error updating tax form:', error);
    return NextResponse.json({ error: 'Failed to update tax form' }, { status: 500 });
  }
}

/**
 * DELETE /api/tax-forms/[id]
 * Delete tax form (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
      select: { role: true },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.taxForm.delete({
      where: { id },
    });

    logger.info(`Tax form deleted: ${id} by ${userId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting tax form:', error);
    return NextResponse.json({ error: 'Failed to delete tax form' }, { status: 500 });
  }
}
