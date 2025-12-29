import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type definitions (replacing @prisma/client)
interface Profile {
  id: string;
  role: string;
  supabaseUserId?: string | null;
  userId?: string | null;
  email?: string | null;
}

interface GeneratedImage {
  id: string;
  prompt: string;
  negativePrompt?: string | null;
  provider: string;
  modelUsed?: string | null;
  status: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  tags?: string[];
  category?: string | null;
  generationId?: string | null;
  createdBy?: string | null;
  acceptedBy?: string | null;
  acceptedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/admin/image-center/images
 * List all generated images with filtering, sorting, and pagination
 * Admin only
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: profilesData, error: profileError } = await db
      .from('profiles')
      .select('*')
      .or(`supabase_user_id.eq.${userId},user_id.eq.${userId},email.eq.${session?.user?.email || ''}`)
      .limit(1);

    if (profileError) {
      logger.error('Failed to fetch profile', { error: profileError.message });
      return NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 });
    }

    const profile = firstOrNull<Profile>(profilesData);

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Calculate pagination offset
    const offset = (page - 1) * limit;

    // Build query
    let query = db
      .from('generated_images')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (provider) {
      query = query.eq('provider', provider);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    if (search) {
      query = query.ilike('prompt', `%${search}%`);
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy === 'createdAt' ? 'created_at' : sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1);

    const { data: imagesData, error: imagesError, count } = await query;

    if (imagesError) {
      logger.error('Failed to fetch images', { error: imagesError.message });
      return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
    }

    const images = (imagesData || []) as GeneratedImage[];
    const total = count || 0;

    // Fetch related profiles for creators and accepters
    const creatorIds = [...new Set(images.map(img => img.createdBy).filter(Boolean))];
    const accepterIds = [...new Set(images.map(img => img.acceptedBy).filter(Boolean))];
    const allProfileIds = [...new Set([...creatorIds, ...accepterIds])];

    let profilesMap: Record<string, { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }> = {};

    if (allProfileIds.length > 0) {
      const { data: relatedProfiles } = await db
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', allProfileIds);

      if (relatedProfiles) {
        profilesMap = relatedProfiles.reduce((acc, p) => {
          acc[p.id] = {
            id: p.id,
            firstName: p.first_name,
            lastName: p.last_name,
            avatarUrl: p.avatar_url,
          };
          return acc;
        }, {} as typeof profilesMap);
      }
    }

    // Attach profile data to images
    const imagesWithProfiles = images.map(img => ({
      ...img,
      createdByProfile: img.createdBy ? profilesMap[img.createdBy] || null : null,
      acceptedByProfile: img.acceptedBy ? profilesMap[img.acceptedBy] || null : null,
    }));

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      images: imagesWithProfiles,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch generated images', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
