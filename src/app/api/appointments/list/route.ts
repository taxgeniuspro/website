/**
 * Appointments List API
 * Returns appointments based on user permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, firstOrNull } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

// Local TypeScript interface
interface UserProfile {
  id: string;
  role: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and permissions
    const { data: userProfileData } = await db
      .from('profiles')
      .select('id, role')
      .eq('user_id', session.user.id)
      .limit(1);
    const userProfile = firstOrNull<UserProfile>(userProfileData);

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { role } = userProfile;

    // Build query based on role
    let query = db.from('appointments').select('*');

    if (role === 'tax_preparer') {
      // Tax preparers see only their assigned appointments
      query = query.eq('preparer_id', userProfile.id);
    } else if (role === 'client') {
      // Clients see only their own appointments
      query = query.eq('client_id', userProfile.id);
    }
    // Admins and super_admins see all appointments (no filter)

    // Fetch appointments with ordering and limit
    const { data: appointments, error: fetchError } = await query
      .order('scheduled_for', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (fetchError) {
      throw new Error(`Failed to fetch appointments: ${fetchError.message}`);
    }

    return NextResponse.json({
      success: true,
      appointments,
    });
  } catch (error) {
    logger.error('Error fetching appointments:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch appointments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
