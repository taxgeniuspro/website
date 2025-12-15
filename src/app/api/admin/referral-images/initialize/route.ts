/**
 * Initialize Referral Image Folders
 *
 * POST /api/admin/referral-images/initialize
 *
 * Creates:
 * - One "Tax Genius Default" folder (if not exists)
 * - One folder per tax preparer (if not exists)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

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

    // 1. Create default folder if not exists
    const existingDefault = await prisma.referralImageSet.findFirst({
      where: { category: 'default', preparerId: null },
    });

    if (!existingDefault) {
      await prisma.referralImageSet.create({
        data: {
          category: 'default',
          preparerId: null,
          name: 'Tax Genius Default',
          description: 'Default promotional images used when a preparer has no custom images',
          isActive: true,
        },
      });
      created++;
      logger.info('Created default referral image folder');
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

    // 3. Get existing preparer folders
    const existingFolders = await prisma.referralImageSet.findMany({
      where: { category: 'preparer' },
      select: { preparerId: true },
    });
    const existingPreparerIds = new Set(existingFolders.map(f => f.preparerId));

    // 4. Create folders for preparers that don't have one
    for (const preparer of preparers) {
      if (!existingPreparerIds.has(preparer.id)) {
        await prisma.referralImageSet.create({
          data: {
            category: 'preparer',
            preparerId: preparer.id,
            name: `${preparer.firstName} ${preparer.lastName}`,
            description: preparer.customTrackingCode
              ? `Custom images for ${preparer.firstName} (${preparer.customTrackingCode})`
              : `Custom images for ${preparer.firstName} ${preparer.lastName}`,
            isActive: true,
          },
        });
        created++;
        logger.info('Created preparer referral image folder', {
          preparerId: preparer.id,
          name: `${preparer.firstName} ${preparer.lastName}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      message: `Created ${created} folders`,
    });
  } catch (error) {
    logger.error('Error initializing referral image folders', { error });
    return NextResponse.json(
      { error: 'Failed to initialize folders' },
      { status: 500 }
    );
  }
}
