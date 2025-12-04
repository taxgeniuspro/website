import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Only allow REFERRER and ADMIN roles to access marketing materials
    if (profile.role !== 'REFERRER' && profile.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Only referrers can access marketing materials.' },
        { status: 403 }
      );
    }

    // Get optional type filter from query params
    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get('type');

    // Build query
    const whereClause: any = {
      isActive: true,
    };

    if (typeFilter && ['IMAGE', 'TEXT', 'VIDEO', 'TEMPLATE'].includes(typeFilter)) {
      whereClause.materialType = typeFilter;
    }

    // Fetch marketing materials
    const materials = await prisma.marketingMaterial.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }],
    });

    // Return materials directly (Prisma uses camelCase)
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
    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile || profile.role !== 'ADMIN') {
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
    const material = await prisma.marketingMaterial.create({
      data: {
        title,
        description: description || null,
        materialType,
        imageUrl: imageUrl || null,
        adCopy: adCopy || null,
        templateHtml: templateHtml || null,
        tags: tags || [],
        isActive: true,
      },
    });

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
