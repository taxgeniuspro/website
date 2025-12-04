/**
 * Create Test Accounts for TaxGeniusPro
 *
 * This script creates test accounts with different roles for testing purposes.
 * Accounts are created in Clerk and synced to the database via webhook.
 */

import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '../src/lib/prisma';

const TEST_ACCOUNTS = [
  {
    email: 'admin@taxgeniuspro.test',
    password: 'Admin123!Test',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  },
  {
    email: 'affiliate@taxgeniuspro.test',
    password: 'Affiliate123!Test',
    firstName: 'Affiliate',
    lastName: 'Partner',
    role: 'AFFILIATE',
  },
  {
    email: 'lead@taxgeniuspro.test',
    password: 'Lead123!Test',
    firstName: 'Lead',
    lastName: 'Prospect',
    role: 'LEAD',
  },
];

async function createTestAccounts() {
  console.log('🚀 Creating test accounts...\n');

  for (const account of TEST_ACCOUNTS) {
    try {
      console.log(`Creating ${account.role} account: ${account.email}`);

      // Check if user already exists in Clerk
      const existingUsers = await clerkClient.users.getUserList({
        emailAddress: [account.email],
      });

      let clerkUserId: string;

      if (existingUsers.data.length > 0) {
        console.log(`  ℹ️  User already exists in Clerk`);
        clerkUserId = existingUsers.data[0].id;

        // Update metadata
        await clerkClient.users.updateUser(clerkUserId, {
          publicMetadata: {
            role: account.role.toLowerCase(),
          },
          privateMetadata: {
            role: account.role,
          },
        });
        console.log(`  ✅ Updated metadata to ${account.role}`);
      } else {
        // Create new user in Clerk
        const user = await clerkClient.users.createUser({
          emailAddress: [account.email],
          password: account.password,
          firstName: account.firstName,
          lastName: account.lastName,
          publicMetadata: {
            role: account.role.toLowerCase(),
          },
          privateMetadata: {
            role: account.role,
          },
        });

        clerkUserId = user.id;
        console.log(`  ✅ Created user in Clerk: ${clerkUserId}`);
      }

      // Check if profile exists in database
      const existingProfile = await prisma.profile.findUnique({
        where: { clerkUserId },
      });

      if (existingProfile) {
        // Update existing profile
        await prisma.profile.update({
          where: { clerkUserId },
          data: {
            role: account.role,
            firstName: account.firstName,
            lastName: account.lastName,
          },
        });
        console.log(`  ✅ Updated profile in database`);
      } else {
        // Create new profile
        await prisma.profile.create({
          data: {
            clerkUserId,
            role: account.role,
            firstName: account.firstName,
            lastName: account.lastName,
            email: account.email,
          },
        });
        console.log(`  ✅ Created profile in database`);
      }

      console.log(`  🎉 ${account.role} account ready!\n`);
    } catch (error) {
      console.error(`  ❌ Error creating ${account.role} account:`, error);
      console.log('');
    }
  }

  console.log('✅ Test account creation complete!\n');
  console.log('📋 Test Account Credentials:');
  console.log('━'.repeat(50));
  TEST_ACCOUNTS.forEach((account) => {
    console.log(`\n${account.role}:`);
    console.log(`  Email:    ${account.email}`);
    console.log(`  Password: ${account.password}`);
  });
  console.log('\n' + '━'.repeat(50));
}

// Run the script
createTestAccounts()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
