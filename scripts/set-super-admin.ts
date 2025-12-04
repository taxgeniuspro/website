import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setSuperAdmin() {
  const email = 'iradwatkins@gmail.com';

  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.email}`);

    // Check if profile exists
    if (!user.profile) {
      console.log('📝 Creating profile for user...');
      await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'SUPER_ADMIN',
          firstName: 'Irad',
          lastName: 'Watkins'
        }
      });
      console.log('✅ Profile created with SUPER_ADMIN role');
    } else {
      // Update existing profile to SUPER_ADMIN
      console.log(`📝 Current role: ${user.profile.role}`);
      await prisma.profile.update({
        where: { id: user.profile.id },
        data: { role: 'SUPER_ADMIN' }
      });
      console.log('✅ Profile updated to SUPER_ADMIN role');
    }

    // Verify the change
    const updatedUser = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    console.log(`\n🎉 Success! ${email} is now ${updatedUser?.profile?.role}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setSuperAdmin();
