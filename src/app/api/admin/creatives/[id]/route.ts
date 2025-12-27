import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { CreativeType, CreativePrivacy, CreativeStatus } from '@prisma/client';
import {
  getCreativeById,
  updateCreative,
  deleteCreative,
  getCreativeStatistics,
} from '@/lib/services/creative.service';

/**
 * GET /api/admin/creatives/[id]
 * Get a single creative with statistics (admin only)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Get date range from query params
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const creative = await getCreativeById(id, true);

    if (!creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    // Get statistics
    const statistics = await getCreativeStatistics(
      id,
      startDate && endDate
        ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          }
        : undefined
    );

    return NextResponse.json({
      ...creative,
      statistics,
    });
  } catch (error) {
    logger.error('Failed to fetch creative', error);
    return NextResponse.json({ error: 'Failed to fetch creative' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/creatives/[id]
 * Update a creative (admin only)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
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

    // Check if creative exists
    const existingCreative = await getCreativeById(id);

    if (!existingCreative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
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

    // Update creative
    const creative = await updateCreative(id, {
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
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      tags,
      category,
      metadata,
    });

    logger.info('Creative updated', { creativeId: creative.id, name: creative.name });

    return NextResponse.json(creative);
  } catch (error) {
    logger.error('Failed to update creative', error);
    return NextResponse.json({ error: 'Failed to update creative' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/creatives/[id]
 * Delete a creative (admin only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const profile = await prisma.profile.findFirst({
      where: {
        OR: [
          { supabaseUserId: userId },
          { userId: userId },
          { email: session?.user?.email }
        ]
      },
    });

    if (!profile || (profile.role !== 'admin' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if creative exists
    const existingCreative = await getCreativeById(id);

    if (!existingCreative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
    }

    await deleteCreative(id);

    logger.info('Creative deleted', { creativeId: id });

    return NextResponse.json({ success: true, message: 'Creative deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete creative', error);
    return NextResponse.json({ error: 'Failed to delete creative' }, { status: 500 });
  }
}
