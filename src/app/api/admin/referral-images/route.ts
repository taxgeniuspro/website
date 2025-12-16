/**
 * Admin Referral Images API
 *
 * GET /api/admin/referral-images - List all image folders grouped by folderType
 * POST /api/admin/referral-images - Create a new image folder (manual, rarely used)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FolderType } from '@prisma/client';

// Folder type display configuration
const FOLDER_TYPE_INFO: Record<FolderType, { displayName: string; dateRange: string; usedBy: string }> = {
  preseason_loans: {
    displayName: 'Pre-Season Loans',
    dateRange: 'Dec 1 - Jan 14',
    usedBy: 'Tax Preparer',
  },
  tax_season_lead: {
    displayName: 'Tax Season Lead',
    dateRange: 'Jan 15 - Apr 15',
    usedBy: 'Tax Preparer',
  },
  tax_season_intake: {
    displayName: 'Tax Season Intake',
    dateRange: 'Jan 15 - Apr 15',
    usedBy: 'Tax Preparer',
  },
  client_referral: {
    displayName: 'Client Referral',
    dateRange: 'Year-round',
    usedBy: 'Client',
  },
};

export async function GET() {
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

    // Get all image folders (default + preparer folders)
    const imageSets = await prisma.referralImageSet.findMany({
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
          },
        },
        _count: {
          select: { invitations: true },
        },
      },
      orderBy: [
        { category: 'asc' }, // 'default' first, then 'preparer'
        { folderType: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      folderTypeInfo: FOLDER_TYPE_INFO,
      imageSets: imageSets.map((set) => ({
        id: set.id,
        name: set.name,
        description: set.description,
        category: set.category,
        folderType: set.folderType,
        preparerId: set.preparerId,
        preparerName: set.preparer ? `${set.preparer.firstName} ${set.preparer.lastName}` : null,
        preparerCode: set.preparer?.customTrackingCode || null,
        isActive: set.isActive,
        imageCount: set.images.length,
        invitationCount: set._count.invitations,
        images: set.images.map((img) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          fileName: img.fileName,
          altText: img.altText,
          platform: img.platform,
          downloadCount: img.downloadCount,
        })),
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Error listing referral image folders', { error });
    return NextResponse.json(
      { error: 'Failed to list image folders' },
      { status: 500 }
    );
  }
}
