/**
 * Create Test Users Script
 * Creates fake test accounts for all roles with password "Bobby321!"
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Bobby321!';

interface TestUser {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const testUsers: TestUser[] = [
  // Clients
  {
    email: 'client1@test.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'CLIENT',
  },
  {
    email: 'client2@test.com',
    firstName: 'Michael',
    lastName: 'Davis',
    role: 'CLIENT',
  },
  {
    email: 'client3@test.com',
    firstName: 'Emily',
    lastName: 'Martinez',
    role: 'CLIENT',
  },

  // Tax Preparers
  {
    email: 'taxpreparer1@test.com',
    firstName: 'David',
    lastName: 'Wilson',
    role: 'TAX_PREPARER',
  },
  {
    email: 'taxpreparer2@test.com',
    firstName: 'Jennifer',
    lastName: 'Anderson',
    role: 'TAX_PREPARER',
  },
  {
    email: 'taxpreparer3@test.com',
    firstName: 'Robert',
    lastName: 'Taylor',
    role: 'TAX_PREPARER',
  },

  // Affiliates
  {
    email: 'affiliate1@test.com',
    firstName: 'Jessica',
    lastName: 'Brown',
    role: 'AFFILIATE',
  },
  {
    email: 'affiliate2@test.com',
    firstName: 'Christopher',
    lastName: 'Thomas',
    role: 'AFFILIATE',
  },
  {
    email: 'affiliate3@test.com',
    firstName: 'Amanda',
    lastName: 'Moore',
    role: 'AFFILIATE',
  },

  // Lead (pending user)
  {
    email: 'lead1@test.com',
    firstName: 'Daniel',
    lastName: 'Garcia',
    role: 'LEAD',
  },

  // Admin
  {
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'ADMIN',
  },
];

async function createTestUsers() {
  console.log('🔐 Creating test users with password: Bobby321!\n');

  // Hash the password once (same for all users)
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
  console.log('✅ Password hashed\n');

  let created = 0;
  let skipped = 0;

  for (const testUser of testUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      if (existingUser) {
        console.log(`⏭️  Skipping ${testUser.email} (already exists)`);
        skipped++;
        continue;
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          email: testUser.email,
          name: `${testUser.firstName} ${testUser.lastName}`,
          hashedPassword,
          emailVerified: new Date(), // Mark as verified for testing
        },
      });

      // Create profile with role
      await prisma.profile.create({
        data: {
          userId: user.id,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          role: testUser.role,
        },
      });

      console.log(`✅ Created ${testUser.role.padEnd(12)} - ${testUser.email.padEnd(25)} (${testUser.firstName} ${testUser.lastName})`);
      created++;
    } catch (error) {
      console.error(`❌ Error creating ${testUser.email}:`, error);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`📊 Summary: Created ${created} users, Skipped ${skipped} existing users`);
  console.log('='.repeat(80));
  console.log('\n🔑 TEST LOGIN CREDENTIALS:\n');
  console.log('Password (for all): Bobby321!\n');

  // Group by role and display
  const roleGroups = {
    CLIENT: testUsers.filter((u) => u.role === 'CLIENT'),
    TAX_PREPARER: testUsers.filter((u) => u.role === 'TAX_PREPARER'),
    AFFILIATE: testUsers.filter((u) => u.role === 'AFFILIATE'),
    LEAD: testUsers.filter((u) => u.role === 'LEAD'),
    ADMIN: testUsers.filter((u) => u.role === 'ADMIN'),
  };

  console.log('👥 CLIENTS:');
  roleGroups.CLIENT.forEach((u) => {
    console.log(`   • ${u.email.padEnd(30)} - ${u.firstName} ${u.lastName}`);
  });

  console.log('\n💼 TAX PREPARERS:');
  roleGroups.TAX_PREPARER.forEach((u) => {
    console.log(`   • ${u.email.padEnd(30)} - ${u.firstName} ${u.lastName}`);
  });

  console.log('\n🤝 AFFILIATES:');
  roleGroups.AFFILIATE.forEach((u) => {
    console.log(`   • ${u.email.padEnd(30)} - ${u.firstName} ${u.lastName}`);
  });

  console.log('\n📋 LEADS:');
  roleGroups.LEAD.forEach((u) => {
    console.log(`   • ${u.email.padEnd(30)} - ${u.firstName} ${u.lastName}`);
  });

  console.log('\n🛡️  ADMINS:');
  roleGroups.ADMIN.forEach((u) => {
    console.log(`   • ${u.email.padEnd(30)} - ${u.firstName} ${u.lastName}`);
  });

  console.log('\n🌐 Sign in at: https://taxgeniuspro.tax/auth/signin');
  console.log('='.repeat(80) + '\n');
}

createTestUsers()
  .then(() => {
    console.log('✅ Test users created successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creating test users:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
