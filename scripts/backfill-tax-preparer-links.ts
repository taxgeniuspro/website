import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import { generateTaxPreparerStandardLinks } from '../src/lib/services/tax-preparer-links.service';

const prisma = new PrismaClient();

/**
 * Backfill Script: Generate tax preparer links for existing tax preparers
 *
 * This script:
 * 1. Finds all existing tax preparers with finalized tracking codes
 * 2. Generates the two standard links (lead + intake) for each
 * 3. Skips tax preparers who already have links
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔗 BACKFILL TAX PREPARER LINKS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Find all tax preparers with finalized tracking codes
  const taxPreparers = await prisma.profile.findMany({
    where: {
      role: 'tax_preparer',
      trackingCodeFinalized: true,
      OR: [{ trackingCode: { not: null } }, { customTrackingCode: { not: null } }],
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

  console.log(`📋 Found ${taxPreparers.length} tax preparers with finalized tracking codes`);
  console.log('');

  if (taxPreparers.length === 0) {
    console.log('✅ No tax preparers to process. Exiting.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const preparer of taxPreparers) {
    const trackingCode = preparer.customTrackingCode || preparer.trackingCode;
    const displayName = preparer.user?.name || preparer.user?.email || preparer.id;

    console.log(`\n━━━ Processing: ${displayName} (${trackingCode}) ━━━`);

    try {
      // Check if preparer already has links
      const existingLinks = await prisma.marketingLink.findMany({
        where: {
          creatorId: preparer.id,
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

      // Generate tax preparer links
      const result = await generateTaxPreparerStandardLinks(preparer.id);

      console.log(`✅ Success: Generated tax preparer links`);
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
  console.log(`Total Tax Preparers: ${taxPreparers.length}`);
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
