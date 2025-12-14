import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/leads
 * Fetches all leads (users with role=lead) from the database
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Fetch all profiles with role = 'lead'
    const leadProfiles = await prisma.profile.findMany({
      where: { role: 'lead' },
      include: {
        user: {
          select: {
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format response
    const leads = leadProfiles.map((profile) => ({
      id: profile.id,
      visitorId: profile.visitorId,
      email: profile.user.email,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      phone: profile.phone || '',
      role: 'lead',
      createdAt: profile.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      leads,
      totalLeads: leads.length,
    });
  } catch (error) {
    logger.error('Error fetching preparer leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

/**
 * PATCH /api/preparers/leads
 * Changes a lead's role to CLIENT (tax preparers can only promote LEAD → CLIENT)
 *
 * Body: { visitorId: string, newRole: 'client' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can change lead roles' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { visitorId, profileId, newRole } = body;

    // Accept either visitorId or profileId
    const identifier = profileId || visitorId;
    if (!identifier || !newRole) {
      return NextResponse.json(
        { error: 'Missing visitorId/profileId or newRole' },
        { status: 400 }
      );
    }

    // Tax preparers can ONLY change LEAD → CLIENT
    if (role === 'tax_preparer' && newRole !== 'client') {
      return NextResponse.json(
        { error: 'Tax preparers can only change leads to clients' },
        { status: 403 }
      );
    }

    // Find the profile
    const targetProfile = await prisma.profile.findFirst({
      where: profileId ? { id: profileId } : { visitorId: identifier },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (targetProfile.role !== 'lead') {
      return NextResponse.json({ error: 'User is not a lead' }, { status: 400 });
    }

    // Update the profile's role
    const updatedProfile = await prisma.profile.update({
      where: { id: targetProfile.id },
      data: { role: newRole },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    logger.info(
      `🔄 Role changed: ${targetProfile.id} from LEAD to ${newRole.toUpperCase()} by ${user.id} (${role})`
    );

    return NextResponse.json({
      success: true,
      message: `User role changed from LEAD to ${newRole.toUpperCase()}`,
      user: {
        id: updatedProfile.id,
        email: updatedProfile.user.email,
        firstName: updatedProfile.firstName,
        lastName: updatedProfile.lastName,
        role: newRole,
      },
    });
  } catch (error) {
    logger.error('Error changing lead role:', error);
    return NextResponse.json({ error: 'Failed to change lead role' }, { status: 500 });
  }
}
