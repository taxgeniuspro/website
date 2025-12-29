/**
 * Admin Referral Images API
 *
 * GET /api/admin/referral-images - List all image folders grouped by folderType
 * POST /api/admin/referral-images - Create a new image folder (manual, rarely used)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type for FolderType
type FolderType = 'preseason_loans' | 'tax_season_lead' | 'tax_season_intake' | 'client_referral';

// Local interfaces
interface Profile {
  id: string;
  role: string;
}

interface Preparer {
  id: string;
  firstName: string;
  lastName: string;
  customTrackingCode: string | null;
}

interface ReferralImage {
  id: string;
  setId: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  fileName: string | null;
  altText: string | null;
  platform: string | null;
  downloadCount: number;
  sortOrder: number;
}

interface ReferralImageSet {
  id: string;
  name: string;
  description: string | null;
  category: string;
  folderType: string;
  preparerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
    const { data: profileData } = await db.from('profiles')
      .select('role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all image folders (default + preparer folders)
    const { data: imageSets } = await db.from('referral_image_sets')
      .select('*')
      .order('category', { ascending: true })
      .order('folderType', { ascending: true })
      .order('name', { ascending: true });

    // Get all images for these sets
    const setIds = (imageSets || []).map((s: ReferralImageSet) => s.id);
    const { data: allImages } = await db.from('referral_images')
      .select('*')
      .in('setId', setIds.length > 0 ? setIds : [''])
      .order('sortOrder', { ascending: true });

    // Get all preparer info for sets with preparerId
    const preparerIds = (imageSets || [])
      .filter((s: ReferralImageSet) => s.preparerId)
      .map((s: ReferralImageSet) => s.preparerId);

    const { data: preparers } = preparerIds.length > 0
      ? await db.from('profiles')
          .select('id, firstName, lastName, customTrackingCode')
          .in('id', preparerIds)
      : { data: [] };

    // Get invitation counts per set
    const { data: invitationCounts } = await db.from('referral_invitations')
      .select('imageSetId')
      .in('imageSetId', setIds.length > 0 ? setIds : ['']);

    // Build maps for lookups
    const imagesMap = new Map<string, ReferralImage[]>();
    for (const img of (allImages || []) as ReferralImage[]) {
      if (!imagesMap.has(img.setId)) {
        imagesMap.set(img.setId, []);
      }
      imagesMap.get(img.setId)!.push(img);
    }

    const preparerMap = new Map<string, Preparer>();
    for (const p of (preparers || []) as Preparer[]) {
      preparerMap.set(p.id, p);
    }

    // Count invitations per set
    const invitationCountMap = new Map<string, number>();
    for (const inv of (invitationCounts || []) as { imageSetId: string }[]) {
      invitationCountMap.set(inv.imageSetId, (invitationCountMap.get(inv.imageSetId) || 0) + 1);
    }

    return NextResponse.json({
      success: true,
      folderTypeInfo: FOLDER_TYPE_INFO,
      imageSets: (imageSets || []).map((set: ReferralImageSet) => {
        const preparer = set.preparerId ? preparerMap.get(set.preparerId) : null;
        const images = imagesMap.get(set.id) || [];
        return {
          id: set.id,
          name: set.name,
          description: set.description,
          category: set.category,
          folderType: set.folderType,
          preparerId: set.preparerId,
          preparerName: preparer ? `${preparer.firstName} ${preparer.lastName}` : null,
          preparerCode: preparer?.customTrackingCode || null,
          isActive: set.isActive,
          imageCount: images.length,
          invitationCount: invitationCountMap.get(set.id) || 0,
          images: images.map((img) => ({
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
        };
      }),
    });
  } catch (error) {
    logger.error('Error listing referral image folders', { error });
    return NextResponse.json(
      { error: 'Failed to list image folders' },
      { status: 500 }
    );
  }
}
