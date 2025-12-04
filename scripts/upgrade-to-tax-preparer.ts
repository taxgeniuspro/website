/**
 * Upgrade User to Tax Preparer Role
 *
 * Usage: npx tsx scripts/upgrade-to-tax-preparer.ts <clerkUserId>
 */

import { PrismaClient } from '@prisma/client';
import { clerkClient } from '@clerk/clerk-sdk-node';

const prisma = new PrismaClient();

async function main() {
  const clerkUserId = process.argv[2];

  if (!clerkUserId) {
    console.error('❌ Error: Please provide a Clerk user ID');
    console.log('\nUsage: npx tsx scripts/upgrade-to-tax-preparer.ts <clerkUserId>');
    console.log('\nTo find your Clerk user ID:');
    console.log('1. Log in to the app');
    console.log('2. Go to Settings or your profile');
    console.log('3. Or check the database: SELECT "clerkUserId", "firstName", "lastName", role FROM profiles;');
    process.exit(1);
  }

  console.log(`🚀 Upgrading user ${clerkUserId} to TAX_PREPARER...\n`);

  try {
    // 1. Find the profile
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId },
    });

    if (!profile) {
      console.error(`❌ Error: No profile found for Clerk user ID: ${clerkUserId}`);
      process.exit(1);
    }

    console.log(`Found profile:`);
    console.log(`  Name: ${profile.firstName} ${profile.lastName}`);
    console.log(`  Current Role: ${profile.role}`);
    console.log(`  Profile ID: ${profile.id}`);

    if (profile.role === 'TAX_PREPARER') {
      console.log('\n✅ User is already a TAX_PREPARER!');
      return;
    }

    // 2. Update profile to TAX_PREPARER
    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        role: 'TAX_PREPARER',
        companyName: profile.companyName || 'Tax Genius Pro',
        licenseNo: profile.licenseNo || `TGP-${Date.now()}`,
      },
    });

    console.log(`\n✅ Profile updated to TAX_PREPARER!`);

    // 3. Update Clerk metadata
    try {
      await clerkClient.users.updateUserMetadata(clerkUserId, {
        publicMetadata: {
          role: 'TAX_PREPARER',
        },
      });
      console.log(`✅ Clerk metadata updated!`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not update Clerk metadata:`, error);
      console.log(`   You may need to log out and log back in for changes to take effect.`);
    }

    console.log(`\n🎉 Success! ${profile.firstName} ${profile.lastName} is now a TAX_PREPARER!`);
    console.log(`\nNew features unlocked:`);
    console.log(`  ✓ Access to tax preparer dashboard`);
    console.log(`  ✓ Tracking codes for lead attribution`);
    console.log(`  ✓ Client management`);
    console.log(`  ✓ Document review capabilities`);
    console.log(`  ✓ Analytics and reporting`);

  } catch (error) {
    console.error('❌ Error upgrading user:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
