/**
 * Test Script: Create Test Client Accounts
 *
 * Creates 3 test client accounts to verify the signup and dashboard flow works correctly.
 * Run with: npx tsx scripts/test-client-signup.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const testUsers = [
  { name: 'Test Client One', email: 'testclient1@test.taxgeniuspro.tax', password: 'TestClient1@2024!' },
  { name: 'Test Client Two', email: 'testclient2@test.taxgeniuspro.tax', password: 'TestClient2@2024!' },
  { name: 'Test Client Three', email: 'testclient3@test.taxgeniuspro.tax', password: 'TestClient3@2024!' },
];

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function createTestClients() {
  console.log('\n=== Creating Test Client Accounts ===\n');

  for (const testUser of testUsers) {
    try {
      // Check if already exists
      const existing = await prisma.user.findUnique({
        where: { email: testUser.email },
        include: { profile: true },
      });

      if (existing) {
        console.log(`✓ User already exists: ${testUser.email}`);
        console.log(`  - User ID: ${existing.id}`);
        console.log(`  - Profile Role: ${existing.profile?.role || 'NO PROFILE'}`);
        console.log(`  - Has Password: ${!!existing.hashedPassword}`);
        continue;
      }

      // Create user and profile in transaction
      const hashedPassword = await hashPassword(testUser.password);
      const nameParts = testUser.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: testUser.name,
            email: testUser.email.toLowerCase(),
            hashedPassword,
          },
        });

        const profile = await tx.profile.create({
          data: {
            userId: user.id,
            role: 'client',
            firstName,
            lastName,
            affiliateStatus: 'APPROVED',
            affiliateApprovedAt: new Date(),
          },
        });

        return { user, profile };
      });

      console.log(`✓ Created user: ${testUser.email}`);
      console.log(`  - User ID: ${result.user.id}`);
      console.log(`  - Profile ID: ${result.profile.id}`);
      console.log(`  - Role: ${result.profile.role}`);
      console.log(`  - Affiliate Status: ${result.profile.affiliateStatus}`);
      console.log(`  - Password: ${testUser.password}`);
    } catch (error) {
      console.error(`✗ Failed to create user: ${testUser.email}`);
      console.error(`  Error: ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log('\n=== Verification ===\n');

  // Verify all users exist
  for (const testUser of testUsers) {
    const user = await prisma.user.findUnique({
      where: { email: testUser.email },
      include: {
        profile: {
          select: {
            id: true,
            role: true,
            firstName: true,
            lastName: true,
            affiliateStatus: true,
            isActive: true,
          },
        },
      },
    });

    if (user && user.profile) {
      console.log(`✓ ${testUser.email}`);
      console.log(`  - Name: ${user.profile.firstName} ${user.profile.lastName}`);
      console.log(`  - Role: ${user.profile.role}`);
      console.log(`  - Affiliate Status: ${user.profile.affiliateStatus}`);
      console.log(`  - Is Active: ${user.profile.isActive}`);
      console.log(`  - Has Password: ${!!user.hashedPassword}`);
    } else {
      console.error(`✗ ${testUser.email} - Missing user or profile!`);
    }
  }

  console.log('\n=== Test Credentials ===\n');
  console.log('Use these credentials to sign in at https://taxgeniuspro.tax/en/auth/signin:\n');
  for (const testUser of testUsers) {
    console.log(`Email: ${testUser.email}`);
    console.log(`Password: ${testUser.password}`);
    console.log('');
  }
}

createTestClients()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
