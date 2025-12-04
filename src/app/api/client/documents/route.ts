import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET /api/client/documents
 * Get all documents for the authenticated client, organized by tax year
 *
 * Query params:
 * - taxYear (optional): Filter by specific tax year
 * - status (optional): Filter by document status
 *
 * Returns documents grouped by tax year with download URLs
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

    // Check if user is a client (only clients can access this endpoint)
    const role = profile.role;
    if (role !== 'CLIENT' && role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for clients only.' },
        { status: 403 }
      );
    }

    // Get query params
    const taxYear = req.nextUrl.searchParams.get('taxYear');
    const status = req.nextUrl.searchParams.get('status');

    // Build where clause
    const where: any = {
      profileId: profile.id,
    };

    if (taxYear) {
      where.taxYear = parseInt(taxYear);
    }

    if (status) {
      where.status = status;
    }

    // Fetch documents
    const documents = await prisma.document.findMany({
      where,
      orderBy: [{ taxYear: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        type: true,
        fileName: true,
        fileUrl: true,
        fileSize: true,
        mimeType: true,
        taxYear: true,
        status: true,
        reviewNotes: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    // Group documents by tax year
    const documentsByYear = documents.reduce(
      (acc, doc) => {
        const year = doc.taxYear;
        if (!acc[year]) {
          acc[year] = [];
        }
        acc[year].push(doc);
        return acc;
      },
      {} as Record<number, typeof documents>
    );

    // Get statistics
    const stats = {
      totalDocuments: documents.length,
      byYear: Object.entries(documentsByYear).map(([year, docs]) => ({
        year: parseInt(year),
        count: docs.length,
      })),
      byStatus: documents.reduce(
        (acc, doc) => {
          acc[doc.status] = (acc[doc.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return NextResponse.json({
      documents,
      documentsByYear,
      stats,
    });
  } catch (error) {
    logger.error('Error fetching client documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}
