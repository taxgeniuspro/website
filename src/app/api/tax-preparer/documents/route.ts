import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

interface Document {
  id: string;
  profileId: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  taxYear: number;
  status: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientPreparer {
  clientId: string;
}

/**
 * GET /api/tax-preparer/documents
 * Get documents for all clients assigned to the authenticated tax preparer
 * Organized by client and tax year
 *
 * Query params:
 * - clientId (optional): Filter by specific client
 * - taxYear (optional): Filter by specific tax year
 * - status (optional): Filter by document status
 *
 * Returns documents grouped by client and tax year
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    const profile = firstOrNull(profiles);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for tax preparers only.' },
        { status: 403 }
      );
    }

    // Get query params
    const clientIdFilter = req.nextUrl.searchParams.get('clientId');
    const taxYear = req.nextUrl.searchParams.get('taxYear');
    const status = req.nextUrl.searchParams.get('status');

    // Get assigned clients for this preparer (or all clients if admin)
    let assignedClientIds: string[] = [];

    if (role === 'admin') {
      // Admin can see all clients
      const { data: allClients } = await db
        .from('profiles')
        .select('id')
        .eq('role', 'client');
      assignedClientIds = (allClients || []).map((c: { id: string }) => c.id);
    } else {
      // Get clients assigned to this preparer
      const { data: clientPreparers } = await db
        .from('client_preparers')
        .select('clientId')
        .eq('preparerId', profile.id)
        .eq('isActive', true);
      assignedClientIds = (clientPreparers || []).map((cp: ClientPreparer) => cp.clientId);
    }

    // If no assigned clients, return empty result
    if (assignedClientIds.length === 0) {
      return NextResponse.json({
        clients: [],
        stats: {
          totalClients: 0,
          totalDocuments: 0,
        },
      });
    }

    // Check if clientId filter is for an assigned client
    if (clientIdFilter && !assignedClientIds.includes(clientIdFilter)) {
      return NextResponse.json(
        { error: 'Access denied. You are not assigned to this client.' },
        { status: 403 }
      );
    }

    // Build documents query
    const targetClientIds = clientIdFilter ? [clientIdFilter] : assignedClientIds;

    let query = db
      .from('documents')
      .select('*')
      .in('profileId', targetClientIds)
      .order('createdAt', { ascending: false });

    if (taxYear) {
      query = query.eq('taxYear', parseInt(taxYear));
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: documents, error: docsError } = await query;

    if (docsError) {
      throw new Error(docsError.message);
    }

    // Get client profiles for these documents
    const docProfileIds = [...new Set((documents || []).map((d: Document) => d.profileId))];
    let clientProfiles: Profile[] = [];
    if (docProfileIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, firstName, lastName, email, phone')
        .in('id', docProfileIds);
      clientProfiles = profiles || [];
    }

    // Create profile map
    const profileMap = new Map<string, Profile>();
    for (const p of clientProfiles) {
      profileMap.set(p.id, p);
    }

    // Group documents by client, then by year
    const clientsMap = new Map<
      string,
      {
        clientId: string;
        clientName: string;
        clientEmail: string;
        clientPhone: string | null;
        documentsByYear: Record<
          number,
          Array<{
            id: string;
            type: string;
            fileName: string;
            fileUrl: string;
            fileSize: number;
            mimeType: string;
            taxYear: number;
            status: string;
            reviewedBy: string | null;
            reviewedAt: string | null;
            reviewNotes: string | null;
            createdAt: string;
            updatedAt: string;
          }>
        >;
        totalDocuments: number;
      }
    >();

    (documents || []).forEach((doc: Document) => {
      const clientId = doc.profileId;
      const clientProfile = profileMap.get(clientId);
      const clientName = clientProfile
        ? `${clientProfile.firstName || ''} ${clientProfile.lastName || ''}`.trim()
        : '';
      const clientEmail = clientProfile?.email || '';
      const clientPhone = clientProfile?.phone || null;

      if (!clientsMap.has(clientId)) {
        clientsMap.set(clientId, {
          clientId,
          clientName,
          clientEmail,
          clientPhone,
          documentsByYear: {},
          totalDocuments: 0,
        });
      }

      const client = clientsMap.get(clientId)!;
      const year = doc.taxYear;

      if (!client.documentsByYear[year]) {
        client.documentsByYear[year] = [];
      }

      client.documentsByYear[year].push({
        id: doc.id,
        type: doc.type,
        fileName: doc.fileName,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        mimeType: doc.mimeType,
        taxYear: doc.taxYear,
        status: doc.status,
        reviewedBy: doc.reviewedBy,
        reviewedAt: doc.reviewedAt,
        reviewNotes: doc.reviewNotes,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });

      client.totalDocuments++;
    });

    const clients = Array.from(clientsMap.values());

    // Calculate stats
    const byStatus: Record<string, number> = {};
    (documents || []).forEach((doc: Document) => {
      byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;
    });

    const stats = {
      totalClients: clients.length,
      totalDocuments: (documents || []).length,
      byStatus,
    };

    return NextResponse.json({
      clients,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching tax preparer documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
