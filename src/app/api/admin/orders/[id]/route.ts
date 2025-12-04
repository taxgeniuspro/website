import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * PATCH /api/admin/orders/[id]
 * Update order status and tracking (admin only)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, trackingNumber } = body;

    // Update order
    const order = await prisma.order.update({
      where: { id },
      data: {
        status: status || undefined,
        trackingNumber: trackingNumber || undefined,
      },
    });

    logger.info('Order updated', { orderId: order.id, status, userId: profile.id });

    return NextResponse.json({
      ...order,
      total: Number(order.total),
    });
  } catch (error) {
    logger.error('Failed to update order', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
