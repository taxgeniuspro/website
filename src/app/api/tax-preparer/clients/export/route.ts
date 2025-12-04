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

    // Verify user is a tax preparer or admin
    const role = user?.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get preparer profile
    const preparerProfile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get clients assigned to this preparer
    const clientPreparers = await prisma.clientPreparer.findMany({
      where: {
        preparerId: preparerProfile.id,
        isActive: true,
      },
      include: {
        client: {
          include: {
            taxReturns: {
              orderBy: {
                taxYear: 'desc',
              },
              take: 1,
              include: {
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

    // Transform to CSV format
    const csvRows = [
      // Header row
      [
        'Client ID',
        'First Name',
        'Last Name',
        'Email',
        'Phone',
        'Tax Year',
        'Return Status',
        'Documents Count',
        'Last Contact',
        'Assigned Date',
      ].join(','),
    ];

    clientPreparers.forEach(({ client, assignedAt }) => {
      const latestReturn = client.taxReturns[0];
      const returnStatus = latestReturn ? mapTaxReturnStatus(latestReturn.status) : 'Not Started';

      csvRows.push(
        [
          client.id,
          client.firstName || '',
          client.lastName || '',
          client.email || '',
          client.phone || '',
          latestReturn?.taxYear || new Date().getFullYear(),
          returnStatus,
          latestReturn?.documents?.length || 0,
          latestReturn?.updatedAt?.toISOString().split('T')[0] ||
            assignedAt.toISOString().split('T')[0],
          assignedAt.toISOString().split('T')[0],
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

function mapTaxReturnStatus(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Not Started';
    case 'IN_REVIEW':
      return 'In Progress';
    case 'FILED':
      return 'Filed';
    case 'ACCEPTED':
      return 'Filed';
    case 'REJECTED':
      return 'Pending Review';
    default:
      return 'Not Started';
  }
}
