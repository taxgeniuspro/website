import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interface for Profile (replaces @prisma/client import)
interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

// TypeScript interface for Notification (replaces @prisma/client import)
interface Notification {
  id: string;
  profileId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Find the profile for this user
    const { data: profiles, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('userId', user.id);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profiles);

    // If no profile exists yet, return empty array
    if (!profile) {
      return NextResponse.json([]);
    }

    // Fetch notifications for the current user's profile
    const { data: notifications, error: notificationsError } = await db
      .from('notifications')
      .select('*')
      .eq('profileId', profile.id)
      .order('createdAt', { ascending: false })
      .limit(50); // Limit to 50 most recent notifications

    if (notificationsError) {
      logger.error('Error fetching notifications:', notificationsError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json(notifications || []);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
