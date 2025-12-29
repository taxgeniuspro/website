import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface ClientProfile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientPreparer {
  id: string;
  clientId: string;
  preparerId: string;
  isActive: boolean;
  assignedAt: string;
}

interface UserEmail {
  id: string;
  email: string;
}

/**
 * GET /api/tax-preparer/clients
 * Get list of all clients assigned to this tax preparer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get preparer profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', userId)
      .limit(1);

    const preparer = firstOrNull(profiles);

    if (!preparer) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    // Get all clients assigned to this preparer via client_preparers table
    const { data: clientPreparers } = await db
      .from('client_preparers')
      .select('id, clientId, preparerId, isActive, assignedAt')
      .eq('preparerId', preparer.id)
      .eq('isActive', true)
      .order('assignedAt', { ascending: false });

    if (!clientPreparers || clientPreparers.length === 0) {
      return NextResponse.json({
        clients: [],
        stats: {
          totalClients: 0,
          totalDocuments: 0,
        },
      });
    }

    // Get client profiles
    const clientIds = clientPreparers.map((cp: ClientPreparer) => cp.clientId);
    const { data: clientProfiles } = await db
      .from('profiles')
      .select('id, userId, firstName, lastName, phone, createdAt, updatedAt')
      .in('id', clientIds);

    // Get user emails
    const profileUserIds = (clientProfiles || [])
      .map((p: ClientProfile) => p.userId)
      .filter(Boolean);

    let userEmails: UserEmail[] = [];
    if (profileUserIds.length > 0) {
      const { data: users } = await db
        .from('users')
        .select('id, email')
        .in('id', profileUserIds);
      userEmails = users || [];
    }

    // Get document counts per client
    const { data: documentCounts } = await db
      .from('documents')
      .select('profileId')
      .in('profileId', clientIds);

    // Create maps for quick lookup
    const clientProfileMap = new Map<string, ClientProfile>();
    for (const profile of clientProfiles || []) {
      clientProfileMap.set(profile.id, profile);
    }

    const userEmailMap = new Map<string, string>();
    for (const user of userEmails) {
      userEmailMap.set(user.id, user.email);
    }

    // Count documents per profile
    const docCountMap = new Map<string, number>();
    for (const doc of documentCounts || []) {
      docCountMap.set(doc.profileId, (docCountMap.get(doc.profileId) || 0) + 1);
    }

    const clients = clientPreparers.map((cp: ClientPreparer) => {
      const profile = clientProfileMap.get(cp.clientId);
      return {
        id: profile?.id || cp.clientId,
        userId: profile?.userId || null,
        firstName: profile?.firstName || null,
        lastName: profile?.lastName || null,
        email: profile?.userId ? userEmailMap.get(profile.userId) || null : null,
        phone: profile?.phone || null,
        createdAt: profile?.createdAt || null,
        updatedAt: profile?.updatedAt || null,
        documentCount: docCountMap.get(cp.clientId) || 0,
        assignedAt: cp.assignedAt,
      };
    });

    // Calculate stats
    const totalDocuments = clients.reduce((sum, client) => sum + client.documentCount, 0);

    return NextResponse.json({
      clients,
      stats: {
        totalClients: clients.length,
        totalDocuments,
      },
    });
  } catch (error) {
    logger.error('Error fetching tax preparer clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}
