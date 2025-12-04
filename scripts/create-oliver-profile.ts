/**
 * Create Oliver's Profile as Tax Preparer
 *
 * Usage:
 * DATABASE_URL="..." npx tsx scripts/create-oliver-profile.ts <clerk_user_id>
 */

import { PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';

const prisma = new PrismaClient();

// Generate tracking code
const generateTrackingCode = () => {
  const nanoid = customAlphabet('0123456789', 6);
  return `TGP-${nanoid()}`;
};

async function createOliverProfile(clerkUserId: string) {
  try {
    console.log('🔍 Checking if profile already exists...');

    // Check if profile exists
    const existing = await prisma.profile.findUnique({
      where: { clerkUserId },
    });

    if (existing) {
      console.log('✅ Profile already exists!');
      console.log('\nUpdating role to TAX_PREPARER...');

      const updated = await prisma.profile.update({
        where: { clerkUserId },
        data: {
          role: 'TAX_PREPARER',
          firstName: 'Owliver',
          lastName: 'Owl',
        },
      });

      console.log('✅ Profile updated successfully!');
      console.log('\nProfile Details:');
      console.log('  Clerk ID:', updated.clerkUserId);
      console.log('  Role:', updated.role);
      console.log('  Name:', updated.firstName, updated.lastName);
      console.log('  Tracking Code:', updated.trackingCode);
      console.log('\n');
      return;
    }

    // Create new profile
    console.log('📝 Creating new profile for Oliver...');

    const trackingCode = generateTrackingCode();

    const profile = await prisma.profile.create({
      data: {
        clerkUserId,
        role: 'TAX_PREPARER',
        firstName: 'Owliver',
        lastName: 'Owl',
        trackingCode,
        trackingCodeChanged: false,
        shortLinkUsername: trackingCode.toLowerCase(),
        shortLinkUsernameChanged: false,
      },
    });

    console.log('✅ Profile created successfully!');
    console.log('\nProfile Details:');
    console.log('  Clerk ID:', profile.clerkUserId);
    console.log('  Role:', profile.role);
    console.log('  Name:', profile.firstName, profile.lastName);
    console.log('  Tracking Code:', profile.trackingCode);
    console.log('  Email: taxgenius.tax@gmail.com');
    console.log('\n🎉 Oliver can now access the Tax Preparer dashboard!\n');

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
  console.log('❌ Error: Clerk User ID is required\n');
  console.log('Usage: npx tsx scripts/create-oliver-profile.ts <clerk_user_id>');
  console.log('\n📋 To get Oliver\'s Clerk User ID:\n');
  console.log('  Method 1: From Clerk Dashboard');
  console.log('    1. Go to https://dashboard.clerk.com');
  console.log('    2. Click "Users" in the sidebar');
  console.log('    3. Find taxgenius.tax@gmail.com');
  console.log('    4. Click on the user to see their User ID\n');
  console.log('  Method 2: Ask Oliver to visit');
  console.log('    https://taxgeniuspro.tax/debug-role');
  console.log('    His Clerk ID will be displayed on that page\n');
  console.log('Example:');
  console.log('  DATABASE_URL="..." npx tsx scripts/create-oliver-profile.ts user_2abc123xyz456\n');
  process.exit(1);
}

createOliverProfile(clerkUserId);
