/**
 * Initialize Referral Image Folders
 *
 * POST /api/admin/referral-images/initialize
 *
 * Creates 4 folder types per preparer + 4 default folders:
 * - preseason_loans: Dec 1 - Jan 14 (promote pre-season loan products)
 * - tax_season_lead: Jan 15 - Apr 15 (get new leads during tax season)
 * - tax_season_intake: Jan 15 - Apr 15 (get intake form completions)
 * - client_referral: Year-round (clients share to earn referral bonuses)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { FolderType } from '@prisma/client';

// Folder type configuration with display names and descriptions
const FOLDER_TYPE_CONFIG: Record<FolderType, { displayName: string; description: string }> = {
  preseason_loans: {
    displayName: 'Pre-Season Loans',
    description: 'Active Dec 1 - Jan 14. Promote pre-season loan products.',
  },
  tax_season_lead: {
    displayName: 'Tax Season Lead',
    description: 'Active Jan 15 - Apr 15. Get new leads during tax season.',
  },
  tax_season_intake: {
    displayName: 'Tax Season Intake',
    description: 'Active Jan 15 - Apr 15. Get intake form completions.',
  },
  client_referral: {
    displayName: 'Client Referral',
    description: 'Year-round. Clients share to earn $50-$100 referral bonuses.',
  },
};

const ALL_FOLDER_TYPES: FolderType[] = [
  'preseason_loans',
  'tax_season_lead',
  'tax_season_intake',
  'client_referral',
];

export async function POST() {
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

    let created = 0;

    // 1. Create default folders (4 types) if not exist
    for (const folderType of ALL_FOLDER_TYPES) {
      const existingDefault = await prisma.referralImageSet.findFirst({
        where: { category: 'default', preparerId: null, folderType },
      });

      if (!existingDefault) {
        const config = FOLDER_TYPE_CONFIG[folderType];
        await prisma.referralImageSet.create({
          data: {
            category: 'default',
            preparerId: null,
            folderType,
            name: `Tax Genius Default - ${config.displayName}`,
            description: config.description,
            isActive: true,
          },
        });
        created++;
        logger.info('Created default referral image folder', { folderType });
      }
    }

    // 2. Get all tax preparers
    const preparers = await prisma.profile.findMany({
      where: {
        role: { in: ['tax_preparer', 'admin'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customTrackingCode: true,
      },
    });

    // 3. Get existing preparer folders (grouped by preparerId and folderType)
    const existingFolders = await prisma.referralImageSet.findMany({
      where: { category: 'preparer' },
      select: { preparerId: true, folderType: true },
    });

    // Create a Set of "preparerId:folderType" combinations
    const existingCombinations = new Set(
      existingFolders.map(f => `${f.preparerId}:${f.folderType}`)
    );

    // 4. Create 4 folders per preparer (if not exist)
    for (const preparer of preparers) {
      for (const folderType of ALL_FOLDER_TYPES) {
        const key = `${preparer.id}:${folderType}`;

        if (!existingCombinations.has(key)) {
          const config = FOLDER_TYPE_CONFIG[folderType];
          await prisma.referralImageSet.create({
            data: {
              category: 'preparer',
              preparerId: preparer.id,
              folderType,
              name: `${preparer.firstName} ${preparer.lastName}`,
              description: preparer.customTrackingCode
                ? `${config.displayName} images for ${preparer.firstName} (${preparer.customTrackingCode})`
                : `${config.displayName} images for ${preparer.firstName} ${preparer.lastName}`,
              isActive: true,
            },
          });
          created++;
        }
      }
    }

    logger.info('Initialized referral image folders', {
      created,
      preparerCount: preparers.length,
    });

    return NextResponse.json({
      success: true,
      created,
      message: `Created ${created} folders (${preparers.length} preparers × 4 folder types + 4 defaults)`,
    });
  } catch (error) {
    logger.error('Error initializing referral image folders', { error });
    return NextResponse.json(
      { error: 'Failed to initialize folders' },
      { status: 500 }
    );
  }
}
