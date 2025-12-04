/**
 * Create Test Profiles for TaxGeniusPro
 *
 * This script creates test profiles directly in the database.
 * Users can then be created in Clerk manually or via the UI.
 */

import { prisma } from '../src/lib/prisma';

const TEST_PROFILES = [
  {
    id: 'test-admin-profile',
    clerkUserId: 'user_test_admin_taxgenius',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  },
  {
    id: 'test-affiliate-profile',
    clerkUserId: 'user_test_affiliate_taxgenius',
    firstName: 'Affiliate',
    lastName: 'Partner',
    role: 'AFFILIATE',
  },
  {
    id: 'test-lead-profile',
    clerkUserId: 'user_test_lead_taxgenius',
    firstName: 'Lead',
    lastName: 'Prospect',
    role: 'LEAD',
  },
];

async function createTestProfiles() {
  console.log('🚀 Creating test profiles...\n');

  for (const profile of TEST_PROFILES) {
    try {
      console.log(`Creating ${profile.role} profile for ${profile.clerkUserId}`);

      // Check if profile exists
      const existing = await prisma.profile.findUnique({
        where: { id: profile.id },
      });

      if (existing) {
        // Update existing
        await prisma.profile.update({
          where: { id: profile.id },
          data: {
            role: profile.role,
            firstName: profile.firstName,
            lastName: profile.lastName,
          },
        });
        console.log(`  ✅ Updated existing profile`);
      } else {
        // Create new
        await prisma.profile.create({
          data: profile,
        });
        console.log(`  ✅ Created new profile`);
      }

      console.log(`  🎉 ${profile.role} profile ready!\n`);
    } catch (error) {
      console.error(`  ❌ Error creating ${profile.role} profile:`, error);
      console.log('');
    }
  }

  console.log('✅ Test profile creation complete!\n');
  console.log('📋 Test Profiles Created:');
  console.log('━'.repeat(70));
  TEST_PROFILES.forEach((profile) => {
    console.log(`\n${profile.role}:`);
    console.log(`  Clerk User ID: ${profile.clerkUserId}`);
    console.log(`  Profile ID:    ${profile.id}`);
    console.log(`  Name:          ${profile.firstName} ${profile.lastName}`);
  });
  console.log('\n' + '━'.repeat(70));
  console.log('\n⚠️  NOTE: These are database profiles only.');
  console.log('To test these roles, you need to either:');
  console.log('  1. Create Clerk users with matching emails');
  console.log('  2. Use the role switcher as a super admin');
  console.log('  3. Manually sync via webhook\n');
}

// Run the script
createTestProfiles()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
