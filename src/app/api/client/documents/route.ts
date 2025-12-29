import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// TypeScript interfaces for Supabase data
interface Profile {
  id: string;
  role: string;
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string | null;
  fileSize: number | null;
  mimeType: string | null;
  taxYear: number;
  status: string;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

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

    // Get user's profile - use OR conditions for Supabase Auth compatibility
    const { data: profileData, error: profileError } = await db
      .from('profiles')
      .select('id, role')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      logger.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user is a client (only clients can access this endpoint)
    const role = profile.role;
    if (role !== 'client' && role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. This endpoint is for clients only.' },
        { status: 403 }
      );
    }

    // Get query params
    const taxYear = req.nextUrl.searchParams.get('taxYear');
    const status = req.nextUrl.searchParams.get('status');

    // Build query
    let query = db
      .from('documents')
      .select('id, type, file_name, file_url, file_size, mime_type, tax_year, status, review_notes, reviewed_at, created_at, updated_at, metadata')
      .eq('profile_id', profile.id);

    if (taxYear) {
      query = query.eq('tax_year', parseInt(taxYear));
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Order by tax year descending, then created_at descending
    query = query.order('tax_year', { ascending: false }).order('created_at', { ascending: false });

    const { data: documentsData, error: docsError } = await query;

    if (docsError) {
      logger.error('Error fetching documents:', docsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Transform snake_case to camelCase for response
    const documents = (documentsData || []).map((doc: Record<string, unknown>) => ({
      id: doc.id,
      type: doc.type,
      fileName: doc.file_name,
      fileUrl: doc.file_url,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      taxYear: doc.tax_year,
      status: doc.status,
      reviewNotes: doc.review_notes,
      reviewedAt: doc.reviewed_at,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
      metadata: doc.metadata,
    })) as Document[];

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
