import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/leads
 * Fetches all leads (users with role=LEAD) assigned to the authenticated preparer
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    if (role !== 'tax_preparer' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Fetch all Clerk users with role = LEAD
    const { data: allUsers } = await clerk.users.getUserList({
      limit: 500, // Adjust as needed
    });

    // Filter for LEAD users
    const leadUsers = allUsers.filter((u) => u.publicMetadata?.role === 'lead');

    // Format response
    const leads = leadUsers.map((leadUser) => ({
      id: leadUser.id,
      email: leadUser.emailAddresses[0]?.emailAddress || '',
      firstName: leadUser.firstName || '',
      lastName: leadUser.lastName || '',
      role: 'lead',
      createdAt: new Date(leadUser.createdAt).toISOString(),
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
 * Body: { userId: string, newRole: 'client' }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = user?.role as string;
    if (role !== 'tax_preparer' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only tax preparers and admins can change lead roles' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, newRole } = body;

    if (!userId || !newRole) {
      return NextResponse.json({ error: 'Missing userId or newRole' }, { status: 400 });
    }

    // Tax preparers can ONLY change LEAD → CLIENT
    if (role === 'tax_preparer' && newRole !== 'client') {
      return NextResponse.json(
        { error: 'Tax preparers can only change leads to clients' },
        { status: 403 }
      );
    }

    // Verify the target user is currently a LEAD
    const targetUser = await clerk.users.getUser(userId);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentRole = targetUser.publicMetadata?.role as string;
    if (currentRole !== 'lead') {
      return NextResponse.json({ error: 'User is not a lead' }, { status: 400 });
    }

    // Update the user's role
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...targetUser.publicMetadata,
        role: newRole,
      },
    });

    logger.info(
      `🔄 Role changed: ${userId} from LEAD to ${newRole.toUpperCase()} by ${user.id} (${role})`
    );

    return NextResponse.json({
      success: true,
      message: `User role changed from LEAD to ${newRole.toUpperCase()}`,
      user: {
        id: userId,
        email: targetUser.emailAddresses[0]?.emailAddress,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: newRole,
      },
    });
  } catch (error) {
    logger.error('Error changing lead role:', error);
    return NextResponse.json({ error: 'Failed to change lead role' }, { status: 500 });
  }
}
