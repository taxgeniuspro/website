import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { hasAffiliateAccess } from '@/lib/permissions';

// Local TypeScript interfaces (replacing Prisma types)
interface Profile {
  id: string;
  userId: string;
  role: string;
  affiliateStatus: string | null;
}

interface MarketingMaterial {
  id: string;
  title: string;
  description: string | null;
  materialType: string;
  imageUrl: string | null;
  adCopy: string | null;
  templateHtml: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/marketing/materials
 * Returns active marketing materials for referrers
 *
 * Query params:
 * - type: Filter by material type (IMAGE, TEXT, VIDEO, TEMPLATE)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile with role check
    const { data: profiles } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if user has affiliate access using centralized function
    if (!hasAffiliateAccess(profile.role as any, profile.affiliateStatus as any)) {
      return NextResponse.json(
        { error: 'Access denied. Affiliate access required for marketing materials.' },
        { status: 403 }
      );
    }

    // Get optional type filter from query params
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');

    // Build query
    let query = db
      .from('marketing_materials')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (typeFilter && ['IMAGE', 'TEXT', 'VIDEO', 'TEMPLATE'].includes(typeFilter)) {
      query = query.eq('material_type', typeFilter);
    }

    // Fetch marketing materials
    const { data: materials, error } = await query;

    if (error) {
      logger.error('Error fetching marketing materials:', error);
      return NextResponse.json({ error: 'Failed to fetch marketing materials' }, { status: 500 });
    }

    // Return materials directly
    return NextResponse.json(materials, { status: 200 });
  } catch (error) {
    logger.error('Error fetching marketing materials:', error);
    return NextResponse.json({ error: 'Failed to fetch marketing materials' }, { status: 500 });
  }
}

/**
 * POST /api/marketing/materials
 * Create a new marketing material (ADMIN only)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await auth(); const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get profile with ADMIN role check
    const { data: profiles } = await db
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    const profile = firstOrNull(profiles) as Profile | null;

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const { title, description, materialType, imageUrl, adCopy, templateHtml, tags } = body;

    // Validation
    if (!title || !materialType) {
      return NextResponse.json({ error: 'Title and material type are required' }, { status: 400 });
    }

    if (!['IMAGE', 'TEXT', 'VIDEO', 'TEMPLATE'].includes(materialType)) {
      return NextResponse.json(
        { error: 'Invalid material type. Must be IMAGE, TEXT, VIDEO, or TEMPLATE' },
        { status: 400 }
      );
    }

    // Create marketing material
    const { data: material, error } = await db
      .from('marketing_materials')
      .insert({
        title,
        description: description || null,
        material_type: materialType,
        image_url: imageUrl || null,
        ad_copy: adCopy || null,
        template_html: templateHtml || null,
        tags: tags || [],
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating marketing material:', error);
      return NextResponse.json({ error: 'Failed to create marketing material' }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        material,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating marketing material:', error);
    return NextResponse.json({ error: 'Failed to create marketing material' }, { status: 500 });
  }
}
