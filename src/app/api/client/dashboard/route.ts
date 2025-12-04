import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    // Get current tax year
    const currentYear = new Date().getFullYear();
    const taxYear = req.nextUrl.searchParams.get('year')
      ? parseInt(req.nextUrl.searchParams.get('year')!)
      : currentYear - 1;

    // Get tax return with documents
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
        documentsCount: taxReturn?.documents.length || 0,
        estimatedRefund: taxReturn?.refundAmount ? Number(taxReturn.refundAmount) : 0,
        daysUntilDeadline: Math.ceil(
          (new Date(`${taxYear + 1}-04-15`).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error fetching client dashboard:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
