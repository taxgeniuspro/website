import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  role: string;
}

interface Order {
  id: string;
  profileId: string;
  total: number;
  status: string;
  trackingNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

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
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, trackingNumber } = body;

    // Build update data
    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;

    // Update order
    const { data: order, error: updateError } = await db.from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

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
