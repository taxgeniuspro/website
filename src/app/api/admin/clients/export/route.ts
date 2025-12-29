import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local interfaces
interface Profile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface TaxReturn {
  id: string;
  clientId: string;
  taxYear: number;
  status: string;
}

interface Document {
  id: string;
  taxReturnId: string;
}

interface ClientPreparer {
  id: string;
  clientId: string;
  preparerId: string;
  isActive: boolean;
}

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

    // Fetch all clients
    const { data: clients, error: clientsError } = await db.from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('createdAt', { ascending: false });

    if (clientsError) {
      throw clientsError;
    }

    const clientIds = (clients || []).map((c: Profile) => c.id);

    // Fetch tax returns for all clients
    let taxReturnsQuery = db.from('tax_returns')
      .select('*')
      .in('clientId', clientIds)
      .order('taxYear', { ascending: false });

    if (status) {
      taxReturnsQuery = taxReturnsQuery.eq('status', status.toUpperCase());
    }

    const { data: taxReturns } = await taxReturnsQuery;

    // Get tax return IDs for document counting
    const taxReturnIds = (taxReturns || []).map((tr: TaxReturn) => tr.id);

    // Fetch documents
    const { data: documents } = await db.from('documents')
      .select('id, taxReturnId')
      .in('taxReturnId', taxReturnIds);

    // Fetch client-preparer assignments
    let clientPreparersQuery = db.from('client_preparers')
      .select('*')
      .in('clientId', clientIds)
      .eq('isActive', true);

    if (preparerId && preparerId !== 'all' && preparerId !== 'unassigned') {
      clientPreparersQuery = clientPreparersQuery.eq('preparerId', preparerId);
    }

    const { data: clientPreparers } = await clientPreparersQuery;

    // Get preparer IDs for fetching preparer details
    const preparerIds = [...new Set((clientPreparers || []).map((cp: ClientPreparer) => cp.preparerId))];

    // Fetch preparer profiles
    const { data: preparerProfiles } = await db.from('profiles')
      .select('id, firstName, lastName, email')
      .in('id', preparerIds);

    // Create lookup maps
    const taxReturnsByClient = new Map<string, TaxReturn[]>();
    (taxReturns || []).forEach((tr: TaxReturn) => {
      if (!taxReturnsByClient.has(tr.clientId)) {
        taxReturnsByClient.set(tr.clientId, []);
      }
      taxReturnsByClient.get(tr.clientId)!.push(tr);
    });

    const documentsByTaxReturn = new Map<string, Document[]>();
    (documents || []).forEach((doc: Document) => {
      if (!documentsByTaxReturn.has(doc.taxReturnId)) {
        documentsByTaxReturn.set(doc.taxReturnId, []);
      }
      documentsByTaxReturn.get(doc.taxReturnId)!.push(doc);
    });

    const clientPreparersByClient = new Map<string, ClientPreparer[]>();
    (clientPreparers || []).forEach((cp: ClientPreparer) => {
      if (!clientPreparersByClient.has(cp.clientId)) {
        clientPreparersByClient.set(cp.clientId, []);
      }
      clientPreparersByClient.get(cp.clientId)!.push(cp);
    });

    const preparersById = new Map<string, Profile>();
    (preparerProfiles || []).forEach((p: Profile) => {
      preparersById.set(p.id, p);
    });

    // Filter clients based on preparer assignment
    let filteredClients = clients || [];

    if (preparerId === 'unassigned') {
      filteredClients = filteredClients.filter((c: Profile) => !clientPreparersByClient.has(c.id) || clientPreparersByClient.get(c.id)!.length === 0);
    } else if (preparerId && preparerId !== 'all') {
      filteredClients = filteredClients.filter((c: Profile) => {
        const cps = clientPreparersByClient.get(c.id) || [];
        return cps.some((cp: ClientPreparer) => cp.preparerId === preparerId);
      });
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

    filteredClients.forEach((client: Profile) => {
      const clientTaxReturns = taxReturnsByClient.get(client.id) || [];
      const latestReturn = clientTaxReturns[0];
      const clientCps = clientPreparersByClient.get(client.id) || [];
      const assignedPreparer = clientCps[0] ? preparersById.get(clientCps[0].preparerId) : null;
      const returnStatus = latestReturn ? latestReturn.status : 'No Return';
      const docsForReturn = latestReturn ? (documentsByTaxReturn.get(latestReturn.id) || []) : [];

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
          docsForReturn.length,
          client.updatedAt ? new Date(client.updatedAt).toISOString().split('T')[0] : '',
          client.createdAt ? new Date(client.createdAt).toISOString().split('T')[0] : '',
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
