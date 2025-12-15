/**
 * Create Test Admin Account
 *
 * Creates a test admin account for E2E testing.
 *
 * Credentials:
 *   Email: testadmin@taxgeniuspro.test
 *   Password: TestAdmin2024!
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_ADMIN = {
  email: 'testadmin@taxgeniuspro.test',
  password: 'TestAdmin2024!',
  firstName: 'Test',
  lastName: 'Admin',
};

async function createTestAdmin() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           CREATE TEST ADMIN ACCOUNT                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: TEST_ADMIN.email },
      include: { profile: true },
    });

    if (existingUser) {
      console.log(`✅ Test admin already exists: ${TEST_ADMIN.email}`);

      // Verify they have admin role
      if (existingUser.profile?.role === 'admin') {
        console.log('✅ User has admin role');
      } else {
        console.log(`⚠️  User exists but has role: ${existingUser.profile?.role}`);
        console.log('   Updating to admin role...');

        if (existingUser.profile) {
          await prisma.profile.update({
            where: { id: existingUser.profile.id },
            data: { role: 'admin' },
          });
          console.log('✅ Updated to admin role');
        }
      }

      printCredentials();
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(TEST_ADMIN.password, 12);

    // Create user
    console.log('👤 Creating user...');
    const user = await prisma.user.create({
      data: {
        email: TEST_ADMIN.email,
        name: `${TEST_ADMIN.firstName} ${TEST_ADMIN.lastName}`,
        hashedPassword,
        emailVerified: new Date(), // Mark as verified
      },
    });

    // Create profile with admin role
    console.log('🛡️  Creating admin profile...');
    await prisma.profile.create({
      data: {
        userId: user.id,
        firstName: TEST_ADMIN.firstName,
        lastName: TEST_ADMIN.lastName,
        role: 'admin',
        affiliateStatus: 'APPROVED', // Default for all users
      },
    });

    console.log('\n✅ Test admin created successfully!\n');
    printCredentials();

  } catch (error) {
    console.error('❌ Error creating test admin:', error);
    process.exit(1);
  }
}

function printCredentials() {
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST ADMIN CREDENTIALS');
  console.log('═'.repeat(60));
  console.log(`  Email:    ${TEST_ADMIN.email}`);
  console.log(`  Password: ${TEST_ADMIN.password}`);
  console.log('═'.repeat(60));
  console.log('\n🌐 Sign in at: https://taxgeniuspro.tax/en/auth/signin');
  console.log('\n📝 To run admin E2E tests:');
  console.log(`   ADMIN_EMAIL=${TEST_ADMIN.email} ADMIN_PASSWORD=${TEST_ADMIN.password} npx tsx scripts/test-admin-full.ts`);
  console.log('');
}

createTestAdmin()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
