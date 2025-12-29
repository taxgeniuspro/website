import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions
interface ClientProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
}

interface ClientPreparer {
  id: string;
  clientId: string;
  assignedAt: string;
}

interface TaxReturn {
  id: string;
  profileId: string;
  taxYear: number;
  status: string;
  updatedAt: string;
}

interface Document {
  id: string;
  taxReturnId: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a tax preparer or admin
    const role = user?.role;
    if (role !== 'tax_preparer' && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get preparer profile
    const { data: profiles } = await db
      .from('profiles')
      .select('id')
      .eq('userId', user.id)
      .limit(1);

    const preparerProfile = firstOrNull(profiles);

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get clients assigned to this preparer
    const { data: clientPreparers } = await db
      .from('client_preparers')
      .select('id, clientId, assignedAt')
      .eq('preparerId', preparerProfile.id)
      .eq('isActive', true)
      .order('assignedAt', { ascending: false });

    if (!clientPreparers || clientPreparers.length === 0) {
      // Return empty CSV with just headers
      const csv = [
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
      ].join(',');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="clients-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    // Get client profiles
    const clientIds = clientPreparers.map((cp: ClientPreparer) => cp.clientId);
    const { data: clientProfiles } = await db
      .from('profiles')
      .select('id, firstName, lastName, email, phone')
      .in('id', clientIds);

    // Get tax returns for these clients (most recent per client)
    const { data: taxReturns } = await db
      .from('tax_returns')
      .select('id, profileId, taxYear, status, updatedAt')
      .in('profileId', clientIds)
      .order('taxYear', { ascending: false });

    // Get document counts per tax return
    const taxReturnIds = (taxReturns || []).map((tr: TaxReturn) => tr.id);
    let documentCounts: Document[] = [];
    if (taxReturnIds.length > 0) {
      const { data: docs } = await db
        .from('documents')
        .select('id, taxReturnId')
        .in('taxReturnId', taxReturnIds);
      documentCounts = docs || [];
    }

    // Create maps for quick lookup
    const clientProfileMap = new Map<string, ClientProfile>();
    for (const profile of clientProfiles || []) {
      clientProfileMap.set(profile.id, profile);
    }

    // Latest tax return per client
    const latestReturnMap = new Map<string, TaxReturn>();
    for (const tr of taxReturns || []) {
      if (!latestReturnMap.has(tr.profileId)) {
        latestReturnMap.set(tr.profileId, tr);
      }
    }

    // Document count per tax return
    const docCountMap = new Map<string, number>();
    for (const doc of documentCounts) {
      docCountMap.set(doc.taxReturnId, (docCountMap.get(doc.taxReturnId) || 0) + 1);
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
        'Tax Year',
        'Return Status',
        'Documents Count',
        'Last Contact',
        'Assigned Date',
      ].join(','),
    ];

    clientPreparers.forEach((cp: ClientPreparer) => {
      const client = clientProfileMap.get(cp.clientId);
      const latestReturn = latestReturnMap.get(cp.clientId);
      const returnStatus = latestReturn ? mapTaxReturnStatus(latestReturn.status) : 'Not Started';
      const docCount = latestReturn ? docCountMap.get(latestReturn.id) || 0 : 0;

      csvRows.push(
        [
          client?.id || cp.clientId,
          client?.firstName || '',
          client?.lastName || '',
          client?.email || '',
          client?.phone || '',
          latestReturn?.taxYear || new Date().getFullYear(),
          returnStatus,
          docCount,
          latestReturn?.updatedAt?.split('T')[0] || cp.assignedAt.split('T')[0],
          cp.assignedAt.split('T')[0],
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
