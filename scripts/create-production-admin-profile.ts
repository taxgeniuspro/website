/**
 * Create Production Super Admin Database Profile
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createProductionAdminProfile() {
  const clerkUserId = 'user_33zSPXI2yVj6g6fEOvOogJSMcHn';

  try {
    console.log('🔍 Checking if profile exists...\n');

    const existing = await prisma.profile.findUnique({
      where: { clerkUserId },
    });

    if (existing) {
      console.log('✅ Profile already exists!');
      console.log('Updating to SUPER_ADMIN...\n');

      const updated = await prisma.profile.update({
        where: { clerkUserId },
        data: {
          role: 'SUPER_ADMIN',
          firstName: 'Ira',
          lastName: 'Watkins',
        },
      });

      console.log('✅ Profile updated!');
      console.log('  ID:', updated.id);
      console.log('  Role:', updated.role);
      console.log('  Name:', updated.firstName, updated.lastName);
      console.log('  Tracking Code:', updated.trackingCode);
      return;
    }

    console.log('📝 Creating new profile...\n');

    const profile = await prisma.profile.create({
      data: {
        clerkUserId,
        role: 'SUPER_ADMIN',
        firstName: 'Ira',
        lastName: 'Watkins',
        trackingCode: 'TGP-100000',
        trackingCodeChanged: false,
        shortLinkUsername: 'irawatkins',
        shortLinkUsernameChanged: false,
      },
    });

    console.log('✅ Profile created successfully!');
    console.log('  ID:', profile.id);
    console.log('  Clerk ID:', profile.clerkUserId);
    console.log('  Role:', profile.role);
    console.log('  Name:', profile.firstName, profile.lastName);
    console.log('  Tracking Code:', profile.trackingCode);
    console.log('\n🎉 ira@irawatkins.com is now a SUPER_ADMIN!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createProductionAdminProfile();
