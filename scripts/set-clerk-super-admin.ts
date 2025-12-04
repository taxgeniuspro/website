import 'dotenv/config';
import { clerkClient } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY not found in environment');
  process.exit(1);
}

async function setSuperAdmin() {
  const email = 'iradwatkins@gmail.com';

  try {
    console.log(`🔍 Searching for Clerk user: ${email}`);

    // Get all users and find by email
    const usersResponse = await (await clerkClient()).users.getUserList({
      emailAddress: [email]
    });

    if (!usersResponse || usersResponse.data.length === 0) {
      console.error(`❌ No Clerk user found with email: ${email}`);
      console.log('\n💡 User needs to sign up at the application first.');
      process.exit(1);
    }

    const user = usersResponse.data[0];
    console.log(`✅ Found Clerk user: ${user.id}`);
    console.log(`📧 Email: ${user.emailAddresses[0].emailAddress}`);
    console.log(`📝 Current role: ${user.publicMetadata?.role || 'none'}`);

    // Update Clerk user metadata
    console.log('\n📝 Updating user role to SUPER_ADMIN...');
    await (await clerkClient()).users.updateUserMetadata(user.id, {
      publicMetadata: {
        role: 'super_admin'
      }
    });

    console.log('✅ Clerk metadata updated');

    // Update or create Profile in database
    console.log('\n📝 Updating database profile...');

    const profile = await prisma.profile.findUnique({
      where: { clerkUserId: user.id }
    });

    if (!profile) {
      console.log('Creating new profile...');
      await prisma.profile.create({
        data: {
          clerkUserId: user.id,
          role: 'SUPER_ADMIN',
          firstName: user.firstName || 'Irad',
          lastName: user.lastName || 'Watkins'
        }
      });
      console.log('✅ Profile created');
    } else {
      console.log(`Current database role: ${profile.role}`);
      if (profile.role !== 'SUPER_ADMIN') {
        await prisma.profile.update({
          where: { id: profile.id },
          data: { role: 'SUPER_ADMIN' }
        });
        console.log('✅ Profile updated to SUPER_ADMIN');
      } else {
        console.log('✅ Profile already has SUPER_ADMIN role');
      }
    }

    console.log(`\n🎉 Success!`);
    console.log(`📧 ${email} is now SUPER_ADMIN`);
    console.log(`🔗 Clerk User ID: ${user.id}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setSuperAdmin();
