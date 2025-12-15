/**
 * Admin Referral Images API
 *
 * GET /api/admin/referral-images - List all image sets
 * POST /api/admin/referral-images - Create a new image set
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const preparerId = searchParams.get('preparerId');

    // Build filter
    const where: { category?: string; preparerId?: string | null } = {};
    if (category) {
      where.category = category;
    }
    if (preparerId) {
      where.preparerId = preparerId;
    }

    // Get all image sets
    const imageSets = await prisma.referralImageSet.findMany({
      where,
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        preparer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customTrackingCode: true,
            trackingCode: true,
          },
        },
        _count: {
          select: { invitations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      imageSets: imageSets.map((set) => ({
        id: set.id,
        name: set.name,
        description: set.description,
        category: set.category,
        preparerId: set.preparerId,
        preparerName: set.preparer
          ? `${set.preparer.firstName} ${set.preparer.lastName}`
          : null,
        preparerCode: set.preparer?.customTrackingCode || set.preparer?.trackingCode,
        validFrom: set.validFrom,
        validUntil: set.validUntil,
        isActive: set.isActive,
        imageCount: set.images.length,
        invitationCount: set._count.invitations,
        images: set.images.map((img) => ({
          id: img.id,
          url: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          fileName: img.fileName,
          alt: img.altText,
          platform: img.platform,
          downloadCount: img.downloadCount,
        })),
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing referral image sets', { error });
    return NextResponse.json(
      { error: 'Failed to list image sets' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    });

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, category, preparerId, validFrom, validUntil, isActive } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['preseason-loans', 'tax-season', 'preparer-custom'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // If preparer-custom, preparerId is required
    if (category === 'preparer-custom' && !preparerId) {
      return NextResponse.json(
        { error: 'Preparer ID is required for preparer-custom category' },
        { status: 400 }
      );
    }

    // Create the image set
    const imageSet = await prisma.referralImageSet.create({
      data: {
        name,
        description: description || null,
        category,
        preparerId: preparerId || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        isActive: isActive ?? true,
      },
    });

    logger.info('Created referral image set', {
      imageSetId: imageSet.id,
      name: imageSet.name,
      category: imageSet.category,
    });

    return NextResponse.json({
      success: true,
      imageSet: {
        id: imageSet.id,
        name: imageSet.name,
        description: imageSet.description,
        category: imageSet.category,
        preparerId: imageSet.preparerId,
        validFrom: imageSet.validFrom,
        validUntil: imageSet.validUntil,
        isActive: imageSet.isActive,
        createdAt: imageSet.createdAt,
      },
    });
  } catch (error) {
    logger.error('Error creating referral image set', { error });
    return NextResponse.json(
      { error: 'Failed to create image set' },
      { status: 500 }
    );
  }
}
