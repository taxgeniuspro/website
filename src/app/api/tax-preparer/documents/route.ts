import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const session = await auth(); const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a tax preparer or admin
    const role = profile.role;
    if (role !== 'TAX_PREPARER' && role !== 'ADMIN') {
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

    if (role === 'ADMIN') {
      // Admin can see all clients
      const allClients = await prisma.profile.findMany({
        where: { role: 'client' },
        select: { id: true },
      });
      assignedClientIds = allClients.map((c) => c.id);
    } else {
      // Get clients assigned to this preparer
      const clientPreparers = await prisma.clientPreparer.findMany({
        where: {
          preparerId: profile.id,
          isActive: true,
        },
        select: { clientId: true },
      });
      assignedClientIds = clientPreparers.map((cp) => cp.clientId);
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

    // Build where clause for documents
    const where: any = {
      profileId: {
        in: clientIdFilter ? [clientIdFilter] : assignedClientIds,
      },
    };

    // Check if clientId filter is for an assigned client
    if (clientIdFilter && !assignedClientIds.includes(clientIdFilter)) {
      return NextResponse.json(
        { error: 'Access denied. You are not assigned to this client.' },
        { status: 403 }
      );
    }

    if (taxYear) {
      where.taxYear = parseInt(taxYear);
    }

    if (status) {
      where.status = status;
    }

    // Fetch documents with client profile info
    const documents = await prisma.document.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        profile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

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
            reviewedAt: Date | null;
            reviewNotes: string | null;
            createdAt: Date;
            updatedAt: Date;
          }>
        >;
        totalDocuments: number;
      }
    >();

    documents.forEach((doc) => {
      const clientId = doc.profileId;
      const clientName = `${doc.profile.firstName || ''} ${doc.profile.lastName || ''}`.trim();
      const clientEmail = doc.profile.email || '';
      const clientPhone = doc.profile.phone;

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
    const stats = {
      totalClients: clients.length,
      totalDocuments: documents.length,
      byStatus: documents.reduce(
        (acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
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
