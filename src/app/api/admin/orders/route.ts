import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Order {
  id: string;
  profileId: string;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

/**
 * GET /api/admin/orders
 * Fetch all orders (admin only)
 */
export async function GET() {
  try {
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('*')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch orders
    const { data: orders, error: ordersError } = await db.from('orders')
      .select('*')
      .order('createdAt', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    // Get profile IDs and fetch profiles
    const profileIds = [...new Set((orders || []).map((o: Order) => o.profileId))];

    const { data: profiles } = await db.from('profiles')
      .select('id, firstName, lastName')
      .in('id', profileIds);

    // Create lookup map
    const profilesById = new Map<string, Profile>();
    (profiles || []).forEach((p: Profile) => {
      profilesById.set(p.id, p);
    });

    // Serialize orders (convert Decimal to number and add profile)
    const serializedOrders = (orders || []).map((order: Order) => {
      const orderProfile = profilesById.get(order.profileId);
      return {
        ...order,
        total: Number(order.total),
        profile: orderProfile ? {
          firstName: orderProfile.firstName,
          lastName: orderProfile.lastName,
        } : null,
      };
    });

    return NextResponse.json(serializedOrders);
  } catch (error) {
    logger.error('Failed to fetch orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}
