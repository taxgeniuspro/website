/**
 * Backfill Referral Links Script
 *
 * This script generates referral links for all existing users who don't have them.
 * It creates two links for each user: one for intake forms, one for appointments.
 *
 * Run: npx tsx scripts/backfill-referral-links.ts
 */

import { PrismaClient } from '@prisma/client';
import { assignTrackingCodeToUser } from '../src/lib/services/tracking-code.service';

const prisma = new PrismaClient();

interface BackfillStats {
  totalUsers: number;
  usersWithTrackingCode: number;
  usersNeedingTrackingCode: number;
  trackingCodesCreated: number;
  referralLinksCreated: number;
  errors: number;
  errorDetails: Array<{ userId: string; error: string }>;
}

async function backfillReferralLinks() {
  console.log('🚀 Starting referral links backfill...\n');

  const stats: BackfillStats = {
    totalUsers: 0,
    usersWithTrackingCode: 0,
    usersNeedingTrackingCode: 0,
    trackingCodesCreated: 0,
    referralLinksCreated: 0,
    errors: 0,
    errorDetails: [],
  };

  try {
    // Get all profiles (all roles except SUPER_ADMIN and ADMIN should have referral links)
    const profiles = await prisma.profile.findMany({
      where: {
        role: {
          in: ['TAX_PREPARER', 'AFFILIATE', 'CLIENT', 'LEAD'],
        },
      },
      select: {
        id: true,
        clerkUserId: true,
        role: true,
        trackingCode: true,
        customTrackingCode: true,
        firstName: true,
        lastName: true,
      },
    });

    stats.totalUsers = profiles.length;
    console.log(`📊 Found ${stats.totalUsers} users to process\n`);

    // Process each profile
    for (const profile of profiles) {
      const activeCode = profile.customTrackingCode || profile.trackingCode;

      if (!activeCode) {
        // User needs tracking code
        stats.usersNeedingTrackingCode++;
        console.log(
          `🆕 Creating tracking code for ${profile.firstName} ${profile.lastName} (${profile.role})...`
        );

        try {
          await assignTrackingCodeToUser(
            profile.id,
            process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
          );
          stats.trackingCodesCreated++;
          console.log(`   ✅ Tracking code created and referral links auto-generated\n`);
        } catch (error: any) {
          stats.errors++;
          stats.errorDetails.push({
            userId: profile.id,
            error: error.message || 'Unknown error',
          });
          console.log(`   ❌ Failed: ${error.message}\n`);
        }
      } else {
        // User has tracking code, check if they have referral links
        stats.usersWithTrackingCode++;

        const intakeCode = `${activeCode}-intake`.toLowerCase();
        const appointmentCode = `${activeCode}-appt`.toLowerCase();

        const existingLinks = await prisma.marketingLink.findMany({
          where: {
            creatorId: profile.id,
            code: {
              in: [intakeCode, appointmentCode],
            },
          },
        });

        if (existingLinks.length === 2) {
          console.log(
            `✅ ${profile.firstName} ${profile.lastName} already has both referral links (${activeCode})`
          );
        } else if (existingLinks.length === 1) {
          console.log(
            `⚠️  ${profile.firstName} ${profile.lastName} has only 1 referral link (${activeCode}), regenerating...`
          );

          try {
            // Delete existing link and regenerate both
            await prisma.marketingLink.deleteMany({
              where: {
                creatorId: profile.id,
                code: {
                  in: [intakeCode, appointmentCode],
                },
              },
            });

            const { autoGenerateReferralLinks } = await import(
              '../src/lib/services/tracking-code.service'
            );
            await autoGenerateReferralLinks(
              profile.id,
              activeCode,
              process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
            );

            stats.referralLinksCreated += 2;
            console.log(`   ✅ Both referral links generated\n`);
          } catch (error: any) {
            stats.errors++;
            stats.errorDetails.push({
              userId: profile.id,
              error: error.message || 'Unknown error',
            });
            console.log(`   ❌ Failed: ${error.message}\n`);
          }
        } else {
          // No referral links, create them
          console.log(
            `🔗 Creating referral links for ${profile.firstName} ${profile.lastName} (${activeCode})...`
          );

          try {
            const { autoGenerateReferralLinks } = await import(
              '../src/lib/services/tracking-code.service'
            );
            await autoGenerateReferralLinks(
              profile.id,
              activeCode,
              process.env.NEXT_PUBLIC_APP_URL || 'https://taxgeniuspro.tax'
            );

            stats.referralLinksCreated += 2;
            console.log(`   ✅ Both referral links generated\n`);
          } catch (error: any) {
            stats.errors++;
            stats.errorDetails.push({
              userId: profile.id,
              error: error.message || 'Unknown error',
            });
            console.log(`   ❌ Failed: ${error.message}\n`);
          }
        }
      }
    }

    // Print summary
    console.log('\n═══════════════════════════════════════');
    console.log('📈 BACKFILL SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total Users Processed:        ${stats.totalUsers}`);
    console.log(`Users with Tracking Code:     ${stats.usersWithTrackingCode}`);
    console.log(`Users Needing Tracking Code:  ${stats.usersNeedingTrackingCode}`);
    console.log(`Tracking Codes Created:       ${stats.trackingCodesCreated}`);
    console.log(`Referral Links Generated:     ${stats.referralLinksCreated}`);
    console.log(`Errors:                       ${stats.errors}`);

    if (stats.errorDetails.length > 0) {
      console.log('\n❌ ERRORS:');
      stats.errorDetails.forEach((err, idx) => {
        console.log(`${idx + 1}. User ${err.userId}: ${err.error}`);
      });
    }

    console.log('\n✅ Backfill complete!\n');
  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillReferralLinks()
  .then(() => {
    console.log('✨ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
