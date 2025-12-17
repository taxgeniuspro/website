import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

/**
 * Backfill Script: Generate preseason cash advance links for all tax preparers
 *
 * This script:
 * 1. Finds all existing tax preparers with finalized tracking codes
 * 2. Generates the cash advance link ({code}-advance) for each
 * 3. Skips tax preparers who already have the advance link
 *
 * The cash advance link points to: /cash-advance?ref={trackingCode}
 */
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 BACKFILL PRESEASON CASH ADVANCE LINKS');
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
      firstName: true,
      lastName: true,
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
    const displayName =
      `${preparer.firstName || ''} ${preparer.lastName || ''}`.trim() ||
      preparer.user?.name ||
      preparer.user?.email ||
      preparer.id;

    console.log(`\n━━━ Processing: ${displayName} (${trackingCode}) ━━━`);

    if (!trackingCode) {
      console.log(`⚠️  Skipped: No tracking code found`);
      skipCount++;
      continue;
    }

    try {
      const advanceCode = `${trackingCode}-advance`;

      // Check if preparer already has cash advance link
      const existingLink = await prisma.marketingLink.findUnique({
        where: { code: advanceCode },
      });

      if (existingLink) {
        console.log(`⏭️  Skipped: Already has cash advance link`);
        console.log(`   URL: ${existingLink.shortUrl}`);
        skipCount++;
        continue;
      }

      // Create the cash advance link
      const advanceUrl = `${APP_URL}/cash-advance?ref=${trackingCode}`;
      const advanceShortUrl = `${APP_URL}/go/${advanceCode}`;

      const advanceLink = await prisma.marketingLink.create({
        data: {
          creatorId: preparer.id,
          creatorType: 'TAX_PREPARER',
          linkType: 'QR_CODE',
          code: advanceCode,
          url: advanceUrl,
          shortUrl: advanceShortUrl,
          targetPage: '/cash-advance',
          title: '💰 Preseason Cash Advance',
          description: 'Get up to $7,000 preseason tax advance - funds available starting January 2',
          campaign: 'preseason-2025',
          dateActivated: new Date(),
          isActive: true,
        },
      });

      console.log(`✅ Success: Generated cash advance link`);
      console.log(`   Code: ${advanceLink.code}`);
      console.log(`   Short URL: ${advanceLink.shortUrl}`);
      successCount++;
    } catch (error: any) {
      console.error(`❌ Error: Failed to generate link`);
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
  console.log('');
  console.log('🔗 All cash advance links follow the pattern:');
  console.log(`   taxgeniuspro.tax/go/{code}-advance`);
  console.log('');
  console.log('📝 Examples:');
  console.log('   taxgeniuspro.tax/go/gw-advance');
  console.log('   taxgeniuspro.tax/go/rh-advance');
  console.log('   taxgeniuspro.tax/go/iw-advance');
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error('Fatal error:', error);
    prisma.$disconnect();
    process.exit(1);
  });
