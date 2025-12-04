import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { generateAffiliateStandardLinks } from '../src/lib/services/affiliate-links.service';

const prisma = new PrismaClient();

/**
 * Backfill Script: Generate affiliate links for existing affiliates
 *
 * This script:
 * 1. Finds all existing affiliates with finalized tracking codes
 * 2. Generates the two standard links (lead + intake) for each
 * 3. Skips affiliates who already have links
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 BACKFILL AFFILIATE LINKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Find all affiliates with finalized tracking codes
  const affiliates = await prisma.profile.findMany({
    where: {
      role: 'affiliate',
      trackingCodeFinalized: true,
      OR: [
        { trackingCode: { not: null } },
        { customTrackingCode: { not: null } },
      ],
    },
    select: {
      id: true,
      userId: true,
      trackingCode: true,
      customTrackingCode: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  console.log(`📋 Found ${affiliates.length} affiliates with finalized tracking codes`);
  console.log('');

  if (affiliates.length === 0) {
    console.log('✅ No affiliates to process. Exiting.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const affiliate of affiliates) {
    const trackingCode = affiliate.customTrackingCode || affiliate.trackingCode;
    const displayName = affiliate.user?.name || affiliate.user?.email || affiliate.id;

    console.log(`\n━━━ Processing: ${displayName} (${trackingCode}) ━━━`);

    try {
      // Check if affiliate already has links
      const existingLinks = await prisma.marketingLink.findMany({
        where: {
          creatorId: affiliate.id,
          code: {
            in: [`${trackingCode}-lead`, `${trackingCode}-intake`],
          },
        },
      });

      if (existingLinks.length === 2) {
        console.log(`⏭️  Skipped: Already has both links`);
        skipCount++;
        continue;
      }

      if (existingLinks.length === 1) {
        console.log(`⚠️  Warning: Has ${existingLinks.length} link (expected 0 or 2)`);
        console.log(`   Existing link: ${existingLinks[0].code}`);
        console.log(`   Generating missing link...`);
      }

      // Generate affiliate links
      const result = await generateAffiliateStandardLinks(affiliate.id);

      console.log(`✅ Success: Generated affiliate links`);
      console.log(`   Lead Link: ${result.leadLink.shortUrl}`);
      console.log(`   Intake Link: ${result.intakeLink.shortUrl}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Error: Failed to generate links`);
      console.error(`   Message: ${error.message}`);
      errorCount++;
    }
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`Total Affiliates: ${affiliates.length}`);
  console.log(`✅ Successfully Generated: ${successCount}`);
  console.log(`⏭️  Skipped (Already Exists): ${skipCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
