/**
 * Sync Clerk Role with Database
 *
 * This script updates a user's Clerk metadata role to match their database profile role
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncClerkRole(clerkUserId: string) {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  if (!clerkSecretKey) {
    console.error('❌ CLERK_SECRET_KEY not found in environment');
    process.exit(1);
  }

  try {
    // Get profile from database
    const profile = await prisma.profile.findUnique({
      where: { clerkUserId },
    });

    if (!profile) {
      console.error(`❌ No profile found for Clerk user ID: ${clerkUserId}`);
      process.exit(1);
    }

    console.log('📊 Current State:');
    console.log('  Database Role:', profile.role);

    // Get current Clerk metadata
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!clerkResponse.ok) {
      console.error('❌ Failed to fetch Clerk user');
      process.exit(1);
    }

    const clerkUser = await clerkResponse.json();
    const currentClerkRole = clerkUser.public_metadata?.role;

    console.log('  Clerk Role:', currentClerkRole || 'NOT SET');

    // Convert database role to lowercase for Clerk (Clerk uses lowercase)
    const targetClerkRole = profile.role.toLowerCase();

    if (currentClerkRole === targetClerkRole) {
      console.log('\n✅ Roles already match! No update needed.');
      return;
    }

    console.log(`\n🔄 Updating Clerk metadata from "${currentClerkRole}" to "${targetClerkRole}"...`);

    // Update Clerk metadata
    const updateResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: targetClerkRole,
        },
      }),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error('❌ Failed to update Clerk metadata:', error);
      process.exit(1);
    }

    console.log('✅ Successfully synced Clerk role!');
    console.log('\nUpdated Details:');
    console.log('  Clerk ID:', clerkUserId);
    console.log('  Name:', profile.firstName, profile.lastName);
    console.log('  Database Role:', profile.role);
    console.log('  Clerk Role:', targetClerkRole);
    console.log('\n💡 User should log out and log back in to see changes.\n');

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
  console.log('Usage: npx tsx scripts/sync-clerk-role.ts <clerk_user_id>');
  console.log('\nExample:');
  console.log('  CLERK_SECRET_KEY="..." npx tsx scripts/sync-clerk-role.ts user_2abc123xyz456\n');
  process.exit(1);
}

syncClerkRole(clerkUserId);
