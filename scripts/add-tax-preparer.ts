/**
 * Add Tax Preparer Script
 *
 * This script updates a user's role to TAX_PREPARER in the database
 * after they have signed up through Clerk.
 *
 * Usage:
 * DATABASE_URL="..." npx tsx scripts/add-tax-preparer.ts <clerk_user_id>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTaxPreparer(clerkUserId: string) {
  try {
    // Find the user's profile
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId },
    });

    if (!profile) {
      console.error(`❌ No profile found for Clerk user ID: ${clerkUserId}`);
      console.log('\n💡 The user needs to sign up first at: https://taxgeniuspro.tax/auth/signup');
      console.log('   After signup, they will be assigned a role. Then run this script again.\n');
      process.exit(1);
    }

    // Update role to TAX_PREPARER
    const updated = await prisma.profile.update({
      where: { clerkUserId },
      data: { role: 'TAX_PREPARER' },
    });

    console.log('✅ Successfully updated user to TAX_PREPARER');
    console.log('\nProfile Details:');
    console.log('  Clerk ID:', updated.clerkUserId);
    console.log('  Role:', updated.role);
    console.log('  Name:', updated.firstName, updated.lastName);
    console.log('  Tracking Code:', updated.trackingCode);
    console.log('\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get Clerk user ID from command line
const clerkUserId = process.argv[2];

if (!clerkUserId) {
  console.log('Usage: npx tsx scripts/add-tax-preparer.ts <clerk_user_id>');
  console.log('\nExample:');
  console.log('  DATABASE_URL="..." npx tsx scripts/add-tax-preparer.ts user_2abc123xyz456');
  console.log('\n💡 To get the Clerk user ID:');
  console.log('  1. Have the user sign up at https://taxgeniuspro.tax/auth/signup');
  console.log('  2. Check the Clerk dashboard or database for their user ID');
  console.log('  3. Run this script with their Clerk user ID\n');
  process.exit(1);
}

addTaxPreparer(clerkUserId);
