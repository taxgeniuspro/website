/**
 * Appointments List API
 * Returns appointments based on user permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile to check role and permissions
    const userProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const { role } = userProfile;

    // Build query based on role
    let whereClause: any = {};

    if (role === 'tax_preparer') {
      // Tax preparers see only their assigned appointments
      whereClause.preparerId = userProfile.id;
    } else if (role === 'client') {
      // Clients see only their own appointments
      whereClause.clientId = userProfile.id;
    }
    // Admins and super_admins see all appointments (no where clause)

    // Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: [
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 100, // Limit for performance
    });

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
