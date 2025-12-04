import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const role = user?.role;
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const preparerId = searchParams.get('preparerId');
    const status = searchParams.get('status');

    // Build query
    const where: any = {
      role: 'client',
    };

    // Fetch all clients with optional filtering
    const clients = await prisma.profile.findMany({
      where,
      include: {
        taxReturns: {
          where: status ? { status: status.toUpperCase() as any } : undefined,
          orderBy: {
            taxYear: 'desc',
          },
          take: 1,
          include: {
            documents: true,
          },
        },
        clientPreparers: {
          where: {
            isActive: true,
            ...(preparerId && preparerId !== 'all' && preparerId !== 'unassigned'
              ? { preparerId }
              : {}),
          },
          include: {
            preparer: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter clients based on preparer assignment
    let filteredClients = clients;

    if (preparerId === 'unassigned') {
      filteredClients = clients.filter((c) => c.clientPreparers.length === 0);
    } else if (preparerId && preparerId !== 'all') {
      filteredClients = clients.filter((c) =>
        c.clientPreparers.some((cp) => cp.preparerId === preparerId)
      );
    }

    // Transform to CSV format
    const csvRows = [
      // Header row
      [
        'Client ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Assigned Preparer',
        'Preparer Email',
        'Tax Year',
        'Return Status',
        'Documents Count',
        'Last Updated',
        'Created Date',
      ].join(','),
    ];

    filteredClients.forEach((client) => {
      const latestReturn = client.taxReturns[0];
      const assignedPreparer = client.clientPreparers[0]?.preparer;
      const returnStatus = latestReturn ? latestReturn.status : 'No Return';

      csvRows.push(
        [
          client.id,
          client.firstName || '',
          client.lastName || '',
          client.email || '',
          client.phone || '',
          assignedPreparer
            ? `${assignedPreparer.firstName || ''} ${assignedPreparer.lastName || ''}`.trim()
            : 'Unassigned',
          assignedPreparer?.email || '',
          latestReturn?.taxYear || '',
          returnStatus,
          latestReturn?.documents?.length || 0,
          client.updatedAt.toISOString().split('T')[0],
          client.createdAt.toISOString().split('T')[0],
        ].join(',')
      );
    });

    const csv = csvRows.join('\n');

    // Return CSV file
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting clients:', error);
    return NextResponse.json({ error: 'Failed to export clients' }, { status: 500 });
  }
}
