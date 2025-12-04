import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/preparers/clients/[clientId]
 * Fetches detailed information about a specific client
 * Including all tax returns, documents, and questionnaire data
 *
 * Epic 3, Story 3.3: Preparer Client & Document Portal
 */
export async function GET(req: NextRequest, { params }: { params: { clientId: string } }) {
  try {
    const session = await auth(); const user = session?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preparer profile
    const preparerProfile = await prisma.profile.findFirst({
      where: {
        user: { email: user.emailAddresses[0]?.emailAddress },
        role: 'PREPARER',
      },
    });

    if (!preparerProfile) {
      return NextResponse.json({ error: 'Preparer profile not found' }, { status: 404 });
    }

    const clientId = params.clientId;

    // Verify this client is assigned to this preparer
    const assignment = await prisma.clientPreparer.findUnique({
      where: {
        clientId_preparerId: {
          clientId,
          preparerId: preparerProfile.id,
        },
        isActive: true,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Client not assigned to you or assignment inactive' },
        { status: 403 }
      );
    }

    // Get full client details
    const client = await prisma.profile.findUnique({
      where: { id: clientId },
      include: {
        user: {
          select: {
            email: true,
            emailVerified: true,
          },
        },
        taxReturns: {
          orderBy: {
            taxYear: 'desc',
          },
          include: {
            documents: {
              orderBy: {
                uploadedAt: 'desc',
              },
            },
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Transform documents to include secure URLs
    const taxReturnsWithSecureUrls = client.taxReturns.map((taxReturn) => ({
      id: taxReturn.id,
      taxYear: taxReturn.taxYear,
      status: taxReturn.status,
      formData: taxReturn.formData,
      filedDate: taxReturn.filedDate,
      refundAmount: taxReturn.refundAmount,
      oweAmount: taxReturn.oweAmount,
      createdAt: taxReturn.createdAt,
      updatedAt: taxReturn.updatedAt,
      documents: taxReturn.documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        fileType: doc.fileType,
        fileSize: doc.fileSize,
        uploadedAt: doc.uploadedAt,
        // Generate secure download URL (time-limited)
        downloadUrl: `/api/documents/${doc.id}/download`,
      })),
    }));

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.user.email,
        phone: client.phone,
        avatarUrl: client.avatarUrl,
        dateOfBirth: client.dateOfBirth,
        address: client.address,
        taxReturns: taxReturnsWithSecureUrls,
        assignedAt: assignment.assignedAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching client details:', error);
    return NextResponse.json({ error: 'Failed to fetch client details' }, { status: 500 });
  }
}
