import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/clients/[clientId]
 * Fetches detailed information about a specific client
 * Including all tax returns, documents, and questionnaire data
 *
 * Epic 3, Story 3.3: Preparer Client & Document Portal
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
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

    const { clientId } = await params;

    // Verify this client is assigned to this preparer
    const { data: assignmentData } = await db
      .from('client_preparers')
      .select('*')
      .eq('clientId', clientId)
      .eq('preparerId', preparerProfile.id)
      .eq('isActive', true)
      .limit(1);

    const assignment = firstOrNull(assignmentData);

    if (!assignment) {
      return NextResponse.json(
        { error: 'Client not assigned to you or assignment inactive' },
        { status: 403 }
      );
    }

    // Get client profile
    const { data: clientData } = await db
      .from('profiles')
      .select('id, firstName, lastName, phone, avatarUrl, dateOfBirth, address, userId')
      .eq('id', clientId)
      .limit(1);

    const client = firstOrNull(clientData);

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Get user email
    let userEmail: string | undefined;
    let emailVerified: string | null = null;
    if (client.userId) {
      const { data: userData } = await db
        .from('users')
        .select('email, emailVerified')
        .eq('id', client.userId)
        .limit(1);
      if (userData?.[0]) {
        userEmail = userData[0].email;
        emailVerified = userData[0].emailVerified;
      }
    }

    // Get tax returns with documents
    const { data: taxReturns } = await db
      .from('tax_returns')
      .select('id, taxYear, status, formData, filedDate, refundAmount, oweAmount, createdAt, updatedAt')
      .eq('profileId', clientId)
      .order('taxYear', { ascending: false });

    // Get documents for each tax return
    const taxReturnsWithDocs = await Promise.all(
      (taxReturns || []).map(async (taxReturn: any) => {
        const { data: documents } = await db
          .from('documents')
          .select('id, fileName, fileType, fileSize, uploadedAt')
          .eq('taxReturnId', taxReturn.id)
          .order('uploadedAt', { ascending: false });

        return {
          ...taxReturn,
          documents: (documents || []).map((doc: any) => ({
            id: doc.id,
            fileName: doc.fileName,
            fileType: doc.fileType,
            fileSize: doc.fileSize,
            uploadedAt: doc.uploadedAt,
            downloadUrl: `/api/documents/${doc.id}/download`,
          })),
        };
      })
    );

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: userEmail,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        dateOfBirth: client.dateOfBirth,
        address: client.address,
        taxReturns: taxReturnsWithDocs,
        assignedAt: assignment.assignedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
  }
}
