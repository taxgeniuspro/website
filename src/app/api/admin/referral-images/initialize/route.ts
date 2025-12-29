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
import { db, firstOrNull } from '@/lib/db';
import { logger } from '@/lib/logger';

// Local type for FolderType
type FolderType = 'preseason_loans' | 'tax_season_lead' | 'tax_season_intake' | 'client_referral';

// Local interfaces
interface Profile {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  customTrackingCode: string | null;
}

interface ExistingFolder {
  preparerId: string | null;
  folderType: string;
}

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
    const { data: profileData } = await db.from('profiles')
      .select('role')
      .eq('userId', session.user.id)
      .limit(1);

    const profile = firstOrNull<Profile>(profileData);

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let created = 0;

    // 1. Create default folders (4 types) if not exist
    for (const folderType of ALL_FOLDER_TYPES) {
      const { data: existingDefaultData } = await db.from('referral_image_sets')
        .select('id')
        .eq('category', 'default')
        .is('preparerId', null)
        .eq('folderType', folderType)
        .limit(1);

      const existingDefault = firstOrNull(existingDefaultData);

      if (!existingDefault) {
        const config = FOLDER_TYPE_CONFIG[folderType];
        const { error: createError } = await db.from('referral_image_sets')
          .insert({
            category: 'default',
            preparerId: null,
            folderType,
            name: `Tax Genius Default - ${config.displayName}`,
            description: config.description,
            isActive: true,
          });

        if (createError) {
          throw createError;
        }
        created++;
        logger.info('Created default referral image folder', { folderType });
      }
    }

    // 2. Get all tax preparers
    const { data: preparers } = await db.from('profiles')
      .select('id, firstName, lastName, customTrackingCode')
      .in('role', ['tax_preparer', 'admin']);

    // 3. Get existing preparer folders (grouped by preparerId and folderType)
    const { data: existingFolders } = await db.from('referral_image_sets')
      .select('preparerId, folderType')
      .eq('category', 'preparer');

    // Create a Set of "preparerId:folderType" combinations
    const existingCombinations = new Set(
      ((existingFolders || []) as ExistingFolder[]).map(f => `${f.preparerId}:${f.folderType}`)
    );

    // 4. Create 4 folders per preparer (if not exist)
    for (const preparer of (preparers || []) as Profile[]) {
      for (const folderType of ALL_FOLDER_TYPES) {
        const key = `${preparer.id}:${folderType}`;

        if (!existingCombinations.has(key)) {
          const config = FOLDER_TYPE_CONFIG[folderType];
          const { error: createError } = await db.from('referral_image_sets')
            .insert({
              category: 'preparer',
              preparerId: preparer.id,
              folderType,
              name: `${preparer.firstName} ${preparer.lastName}`,
              description: preparer.customTrackingCode
                ? `${config.displayName} images for ${preparer.firstName} (${preparer.customTrackingCode})`
                : `${config.displayName} images for ${preparer.firstName} ${preparer.lastName}`,
              isActive: true,
            });

          if (createError) {
            throw createError;
          }
          created++;
        }
      }
    }

    logger.info('Initialized referral image folders', {
      created,
      preparerCount: (preparers || []).length,
    });

    return NextResponse.json({
      success: true,
      created,
      message: `Created ${created} folders (${(preparers || []).length} preparers × 4 folder types + 4 defaults)`,
    });
  } catch (error) {
    logger.error('Error initializing referral image folders', { error });
    return NextResponse.json(
      { error: 'Failed to initialize folders' },
      { status: 500 }
    );
  }
}
