import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CreativeType, CreativePrivacy, CreativeStatus } from '@prisma/client';
import { createCreative, getCreatives } from '@/lib/services/creative.service';

/**
 * GET /api/admin/creatives
 * Fetch all creatives with pagination and filtering (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as CreativeType | null;
    const status = searchParams.get('status') as CreativeStatus | null;
    const privacy = searchParams.get('privacy') as CreativePrivacy | null;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getCreatives({
      page,
      limit,
      type: type || undefined,
      status: status || undefined,
      privacy: privacy || undefined,
      category,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Failed to fetch creatives', error);
    return NextResponse.json({ error: 'Failed to fetch creatives' }, { status: 500 });
  }
}

/**
 * POST /api/admin/creatives
 * Create a new creative (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      type,
      imageUrl,
      thumbnailUrl,
      text,
      htmlContent,
      videoUrl,
      downloadUrl,
      width,
      height,
      fileSize,
      mimeType,
      targetUrl,
      privacy,
      affiliateIds,
      groupIds,
      status,
      startDate,
      endDate,
      tags,
      category,
      metadata,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate type
    if (type && !Object.values(CreativeType).includes(type)) {
      return NextResponse.json(
        {
          error: 'Invalid creative type. Must be IMAGE, TEXT, VIDEO, BANNER, EMAIL_TEMPLATE, SOCIAL_POST, FLYER, or BUSINESS_CARD',
        },
        { status: 400 }
      );
    }

    // Validate privacy
    if (privacy && !Object.values(CreativePrivacy).includes(privacy)) {
      return NextResponse.json(
        { error: 'Invalid privacy. Must be PUBLIC, PRIVATE, or GROUP_ONLY' },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !Object.values(CreativeStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACTIVE, INACTIVE, SCHEDULED, or EXPIRED' },
        { status: 400 }
      );
    }

    // Create creative
    const creative = await createCreative({
      name,
      description,
      type: type || CreativeType.IMAGE,
      imageUrl,
      thumbnailUrl,
      text,
      htmlContent,
      videoUrl,
      downloadUrl,
      width,
      height,
      fileSize,
      mimeType,
      targetUrl,
      privacy: privacy || CreativePrivacy.PUBLIC,
      affiliateIds: affiliateIds || [],
      groupIds: groupIds || [],
      status: status || CreativeStatus.ACTIVE,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      tags: tags || [],
      category,
      metadata,
      createdBy: profile.id,
    });

    logger.info('Creative created', { creativeId: creative.id, name: creative.name });

    return NextResponse.json(creative);
  } catch (error) {
    logger.error('Failed to create creative', error);
    return NextResponse.json({ error: 'Failed to create creative' }, { status: 500 });
  }
}
