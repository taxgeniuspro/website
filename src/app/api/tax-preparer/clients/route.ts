import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/tax-preparer/clients
 * Get list of all clients assigned to this tax preparer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // Get preparer profile
    const preparer = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!preparer) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    // Get all clients assigned to this preparer via ClientPreparer table
    const clientPreparers = await prisma.clientPreparer.findMany({
      where: {
        preparerId: preparer.id,
        isActive: true,
      },
      include: {
        client: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                documents: true,
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    const clients = clientPreparers.map((cp) => ({
      ...cp.client,
      documentCount: cp.client._count.documents,
      assignedAt: cp.assignedAt,
    }));

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
