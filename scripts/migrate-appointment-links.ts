/**
 * Migration Script: Update appointment links to use ?ref= format
 *
 * This script updates existing appointment links from:
 *   /book?preparer={profileId}
 * to:
 *   /book?ref={trackingCode}
 *
 * Run with: npx tsx scripts/migrate-appointment-links.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APP_URL = process.env.NEXTAUTH_URL || 'https://taxgeniuspro.tax';

async function main() {
  console.log('='.repeat(60));
  console.log('APPOINTMENT LINKS MIGRATION');
  console.log('Updating links to use ?ref= format');
  console.log('='.repeat(60));
  console.log('');

  // Find all appointment links
  const apptLinks = await prisma.marketingLink.findMany({
    where: {
      code: { endsWith: '-appt' },
    },
  });

  console.log(`Found ${apptLinks.length} appointment links to check`);
  console.log('');

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const link of apptLinks) {
    try {
      // Get creator's tracking code
      const profile = await prisma.profile.findUnique({
        where: { id: link.creatorId },
        select: {
          trackingCode: true,
          customTrackingCode: true,
        },
      });

      if (!profile) {
        console.log(`  [SKIP] ${link.code}: Creator not found`);
        skipped++;
        continue;
      }

      const trackingCode = profile.customTrackingCode || profile.trackingCode;
      if (!trackingCode) {
        console.log(`  [SKIP] ${link.code}: No tracking code`);
        skipped++;
        continue;
      }

      // Build new URL with ?ref= format
      const newUrl = `${APP_URL}/book?ref=${trackingCode}`;

      // Check if already migrated
      if (link.url === newUrl) {
        console.log(`  [OK]   ${link.code}: Already using ?ref= format`);
        skipped++;
        continue;
      }

      // Check if still using old ?preparer= format
      if (link.url.includes('?preparer=')) {
        const oldUrl = link.url;

        await prisma.marketingLink.update({
          where: { id: link.id },
          data: {
            url: newUrl,
            targetPage: '/book',
            updatedAt: new Date(),
          },
        });

        console.log(`  [MIGRATED] ${link.code}`);
        console.log(`             Old: ${oldUrl}`);
        console.log(`             New: ${newUrl}`);
        migrated++;
      } else {
        // URL doesn't match expected pattern
        console.log(`  [SKIP] ${link.code}: Unexpected URL format: ${link.url}`);
        skipped++;
      }
    } catch (error) {
      console.log(`  [ERROR] ${link.code}: ${error}`);
      errors++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('MIGRATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
  console.log('');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Migration failed:', e);
    prisma.$disconnect();
    process.exit(1);
  });
