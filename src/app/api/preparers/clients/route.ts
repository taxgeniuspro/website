import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/clients
 * Fetches all clients assigned to the authenticated preparer
 *
 * Epic 3, Story 3.3: Preparer Client & Document Portal
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile using session user ID
    const { data: preparerProfileData } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .eq('role', 'tax_preparer')
      .limit(1);

    const preparerProfile = firstOrNull(preparerProfileData);

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    // Get all clients assigned to this preparer
    const { data: clientAssignments } = await db
      .from('client_preparers')
      .select('clientId, assignedAt')
      .eq('preparerId', preparerProfile.id)
      .eq('isActive', true);

    if (!clientAssignments || clientAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        clients: [],
        totalClients: 0,
      });
    }

    // Get client profiles
    const clientIds = clientAssignments.map((a: any) => a.clientId);
    const { data: clientProfiles } = await db
      .from('profiles')
      .select('id, firstName, lastName, phone, userId')
      .in('id', clientIds);

    // Get user emails for clients
    const userIds = (clientProfiles || []).map((p: any) => p.userId).filter(Boolean);
    const { data: users } = userIds.length > 0
      ? await db.from('users').select('id, email').in('id', userIds)
      : { data: [] };

    // Get most recent tax return for each client
    const { data: taxReturns } = await db
      .from('tax_returns')
      .select('id, profileId, taxYear, status, createdAt, updatedAt')
      .in('profileId', clientIds)
      .order('taxYear', { ascending: false });

    // Get document counts for tax returns
    const taxReturnIds = (taxReturns || []).map((tr: any) => tr.id);
    const { data: documents } = taxReturnIds.length > 0
      ? await db.from('documents').select('id, taxReturnId').in('taxReturnId', taxReturnIds)
      : { data: [] };

    // Create lookup maps
    const userMap = new Map((users || []).map((u: any) => [u.id, u.email]));
    const docCountMap = new Map<string, number>();
    (documents || []).forEach((d: any) => {
      docCountMap.set(d.taxReturnId, (docCountMap.get(d.taxReturnId) || 0) + 1);
    });
    const assignmentMap = new Map(clientAssignments.map((a: any) => [a.clientId, a.assignedAt]));

    // Group tax returns by profileId and get most recent
    const latestReturnMap = new Map<string, any>();
    (taxReturns || []).forEach((tr: any) => {
      if (!latestReturnMap.has(tr.profileId)) {
        latestReturnMap.set(tr.profileId, tr);
      }
    });

    // Transform data for response
    const clients = (clientProfiles || []).map((client: any) => {
      const mostRecentReturn = latestReturnMap.get(client.id);

      return {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.userId ? userMap.get(client.userId) : null,
        phone: client.phone,
        assignedAt: assignmentMap.get(client.id),
        currentReturn: mostRecentReturn
          ? {
              id: mostRecentReturn.id,
              taxYear: mostRecentReturn.taxYear,
              status: mostRecentReturn.status,
              documentCount: docCountMap.get(mostRecentReturn.id) || 0,
              createdAt: mostRecentReturn.createdAt,
              updatedAt: mostRecentReturn.updatedAt,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      clients,
      totalClients: clients.length,
    });
  } catch (error) {
    logger.error('Error fetching preparer clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

/**
 * POST /api/preparers/clients
 * Assigns a client to the authenticated preparer
 *
 * Body: { clientEmail: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile using session user ID
    const { data: preparerProfileData } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .eq('role', 'tax_preparer')
      .limit(1);

    const preparerProfile = firstOrNull(preparerProfileData);

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { clientEmail } = body;

    if (!clientEmail) {
      return NextResponse.json({ error: 'Missing clientEmail' }, { status: 400 });
    }

    // Find client user by email
    const { data: clientUserData } = await db
      .from('users')
      .select('id')
      .eq('email', clientEmail.toLowerCase())
      .limit(1);

    const clientUser = firstOrNull(clientUserData);
    if (!clientUser) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Find client profile
    const { data: clientProfileData } = await db
      .from('profiles')
      .select('id')
      .eq('userId', clientUser.id)
      .eq('role', 'client')
      .limit(1);

    const clientProfile = firstOrNull(clientProfileData);

    if (!clientProfile) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Check if assignment already exists
    const { data: existingAssignmentData } = await db
      .from('client_preparers')
      .select('*')
      .eq('clientId', clientProfile.id)
      .eq('preparerId', preparerProfile.id)
      .limit(1);

    const existingAssignment = firstOrNull(existingAssignmentData);

    if (existingAssignment) {
      // Reactivate if inactive
      if (!existingAssignment.isActive) {
        await db
          .from('client_preparers')
          .update({ isActive: true })
          .eq('id', existingAssignment.id);
      }

      return NextResponse.json({
        success: true,
        message: 'Client already assigned',
        assignment: existingAssignment,
      });
    }

    // Create new assignment
    const { data: newAssignment } = await db
      .from('client_preparers')
      .insert({
        clientId: clientProfile.id,
        preparerId: preparerProfile.id,
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
    });
  } catch (error) {
    logger.error('Error assigning client:', error);
    return NextResponse.json({ error: 'Failed to assign client' }, { status: 500 });
  }
}
