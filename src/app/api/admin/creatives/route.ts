import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';
import { createCreative, getCreatives } from '@/lib/services/creative.service';

// Enum types (replaces @prisma/client imports)
const CreativeType = {
  IMAGE: 'IMAGE',
  TEXT: 'TEXT',
  VIDEO: 'VIDEO',
  BANNER: 'BANNER',
  EMAIL_TEMPLATE: 'EMAIL_TEMPLATE',
  SOCIAL_POST: 'SOCIAL_POST',
  FLYER: 'FLYER',
  BUSINESS_CARD: 'BUSINESS_CARD',
} as const;

const CreativePrivacy = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
  GROUP_ONLY: 'GROUP_ONLY',
} as const;

const CreativeStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SCHEDULED: 'SCHEDULED',
  EXPIRED: 'EXPIRED',
} as const;

type CreativeTypeValue = (typeof CreativeType)[keyof typeof CreativeType];
type CreativePrivacyValue = (typeof CreativePrivacy)[keyof typeof CreativePrivacy];
type CreativeStatusValue = (typeof CreativeStatus)[keyof typeof CreativeStatus];

// Local interface
interface Profile {
  id: string;
  userId: string;
  supabaseUserId: string | null;
  email: string | null;
  role: string;
}

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
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('*')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse query params
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as CreativeTypeValue | null;
    const status = searchParams.get('status') as CreativeStatusValue | null;
    const privacy = searchParams.get('privacy') as CreativePrivacyValue | null;
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
    const { data: profileData, error: profileError } = await db.from('profiles')
      .select('*')
      .or(`supabaseUserId.eq.${userId},userId.eq.${userId},email.eq.${session?.user?.email}`)
      .limit(1);

    if (profileError) {
      throw profileError;
    }

    const profile = firstOrNull<Profile>(profileData);

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
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
    const validTypes = Object.values(CreativeType);
    if (type && !validTypes.includes(type as CreativeTypeValue)) {
      return NextResponse.json(
        {
          error: 'Invalid creative type. Must be IMAGE, TEXT, VIDEO, BANNER, EMAIL_TEMPLATE, SOCIAL_POST, FLYER, or BUSINESS_CARD',
        },
        { status: 400 }
      );
    }

    // Validate privacy
    const validPrivacy = Object.values(CreativePrivacy);
    if (privacy && !validPrivacy.includes(privacy as CreativePrivacyValue)) {
      return NextResponse.json(
        { error: 'Invalid privacy. Must be PUBLIC, PRIVATE, or GROUP_ONLY' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatus = Object.values(CreativeStatus);
    if (status && !validStatus.includes(status as CreativeStatusValue)) {
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
