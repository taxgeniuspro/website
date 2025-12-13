import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getCurrentFilingTaxYear } from '@/lib/utils/tax-year';

/**
 * GET /api/client/dashboard
 * Returns comprehensive dashboard data for client including:
 * - Current tax return with progress
 * - Documents
 * - Recent activity
 * - Messages (if implemented)
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
      logger.error(`Profile not found for user ID: ${userId}`);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get tax year from query param or use current filing year
    const currentFilingYear = getCurrentFilingTaxYear();
    const requestedYear = req.nextUrl.searchParams.get('year');
    const taxYear = requestedYear ? parseInt(requestedYear) : currentFilingYear;

    // Check for completed tax intake for this specific tax year
    // Include full_form_data so client can see their intake summary
    const taxIntake = await prisma.taxIntakeLead.findFirst({
      where: {
        OR: [
          { profileId: profile.id },
          { email: session.user?.email || '' },
        ],
        completed: true,
        tax_year: taxYear,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        completed: true,
        tax_year: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        address_line_1: true,
        address_line_2: true,
        city: true,
        state: true,
        zip_code: true,
        full_form_data: true,
        referrerUsername: true,
        clientFolder: {
          select: {
            id: true,
            name: true,
            path: true,
          },
        },
      },
    });

    // Get assigned preparer (via ClientPreparer table)
    const clientPreparer = await prisma.clientPreparer.findFirst({
      where: {
        clientId: profile.id,
        isActive: true,
      },
      include: {
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Count all documents for this client
    const totalDocumentsCount = await prisma.document.count({
      where: { profileId: profile.id },
    });

    // Get tax return with documents (taxYear already defined above)
    const taxReturn = await prisma.taxReturn.findUnique({
      where: {
        profileId_taxYear: {
          profileId: profile.id,
          taxYear,
        },
      },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Get recent activity (documents, status changes)
    const recentDocuments = await prisma.document.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Calculate progress based on status
    let progress = 0;
    if (taxReturn) {
      switch (taxReturn.status) {
        case 'DRAFT':
          progress = 20;
          break;
        case 'IN_REVIEW':
          progress = 65;
          break;
        case 'FILED':
          progress = 90;
          break;
        case 'ACCEPTED':
          progress = 100;
          break;
        default:
          progress = 10;
      }
    }

    // Build activity feed
    const activity = recentDocuments.map((doc) => ({
      id: doc.id,
      type: 'document',
      title: 'Document Uploaded',
      description: `${doc.fileName} uploaded`,
      timestamp: doc.createdAt.toISOString(),
    }));

    // Add status change activity if return exists
    if (taxReturn) {
      activity.unshift({
        id: `status-${taxReturn.id}`,
        type: 'status',
        title: 'Status Updated',
        description: `Your return is ${taxReturn.status.toLowerCase().replace('_', ' ')}`,
        timestamp: taxReturn.updatedAt.toISOString(),
      });
    }

    // Get referral stats (by tracking code)
    const trackingCode = profile.customTrackingCode || profile.trackingCode;
    const referralStats = await prisma.lead.aggregate({
      where: {
        referrerUsername: trackingCode || undefined,
      },
      _count: true,
    });

    const response = {
      currentReturn: taxReturn
        ? {
            id: taxReturn.id,
            taxYear: taxReturn.taxYear,
            status: taxReturn.status,
            filedDate: taxReturn.filedDate?.toISOString(),
            acceptedDate: taxReturn.acceptedDate?.toISOString(),
            refundAmount: taxReturn.refundAmount ? Number(taxReturn.refundAmount) : undefined,
            oweAmount: taxReturn.oweAmount ? Number(taxReturn.oweAmount) : undefined,
            progress,
            documents: taxReturn.documents.map((doc) => ({
              id: doc.id,
              type: doc.type,
              fileName: doc.fileName,
              fileUrl: doc.secureUrl,
              fileSize: doc.fileSize,
              uploadedAt: doc.createdAt.toISOString(),
              status: 'verified', // TODO: Add status field to document model
            })),
          }
        : null,
      recentActivity: activity.slice(0, 10),
      referralStats: {
        totalLeads: referralStats._count || 0,
      },
      stats: {
        documentsCount: totalDocumentsCount,
        estimatedRefund: taxReturn?.refundAmount ? Number(taxReturn.refundAmount) : 0,
        daysUntilDeadline: Math.ceil(
          (new Date(`${taxYear + 1}-04-15`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },
      // Tax intake status for dashboard conditional rendering
      intakeStatus: {
        hasCompleted: !!taxIntake?.completed,
        intakeId: taxIntake?.id || null,
        taxYear: taxYear,
        currentFilingYear: currentFilingYear,
      },
      // Assigned tax preparer info
      assignedPreparer: clientPreparer?.preparer
        ? {
            id: clientPreparer.preparer.id,
            name: `${clientPreparer.preparer.firstName || ''} ${clientPreparer.preparer.lastName || ''}`.trim(),
            email: clientPreparer.preparer.email,
            avatarUrl: clientPreparer.preparer.avatarUrl,
          }
        : null,
      // Client's document folder
      clientFolder: taxIntake?.clientFolder
        ? {
            id: taxIntake.clientFolder.id,
            name: taxIntake.clientFolder.name,
          }
        : null,
      // Intake form summary for client to view their submitted data
      intakeSummary: taxIntake?.completed
        ? {
            personalInfo: {
              firstName: taxIntake.first_name,
              lastName: taxIntake.last_name,
              email: taxIntake.email,
              phone: taxIntake.phone,
            },
            address: {
              line1: taxIntake.address_line_1,
              line2: taxIntake.address_line_2,
              city: taxIntake.city,
              state: taxIntake.state,
              zipCode: taxIntake.zip_code,
            },
            formData: taxIntake.full_form_data as Record<string, unknown> | null,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching client dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
