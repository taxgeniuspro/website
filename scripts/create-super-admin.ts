import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = 'iradwatkins@gmail.com';
  const password = 'TaxGenius2025!'; // Temporary password - user should change on first login

  try {
    console.log(`🔍 Checking if user ${email} exists...`);

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    if (!user) {
      console.log('📝 Creating new user...');

      // Hash the password
      const hashedPassword = await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1
      });

      // Create user
      user = await prisma.user.create({
        data: {
          email,
          hashedPassword,
          emailVerified: new Date(),
          profile: {
            create: {
              role: 'SUPER_ADMIN',
              firstName: 'Irad',
              lastName: 'Watkins'
            }
          }
        },
        include: { profile: true }
      });

      console.log('✅ User created successfully');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Temporary Password: ${password}`);
      console.log('⚠️  Please change the password on first login!');
    } else {
      console.log(`✅ User already exists: ${user.email}`);

      // Update profile to SUPER_ADMIN if not already
      if (!user.profile) {
        console.log('📝 Creating profile...');
        await prisma.profile.create({
          data: {
            userId: user.id,
            role: 'SUPER_ADMIN',
            firstName: 'Irad',
            lastName: 'Watkins'
          }
        });
        console.log('✅ Profile created with SUPER_ADMIN role');
      } else if (user.profile.role !== 'SUPER_ADMIN') {
        console.log(`📝 Updating role from ${user.profile.role} to SUPER_ADMIN...`);
        await prisma.profile.update({
          where: { id: user.profile.id },
          data: { role: 'SUPER_ADMIN' }
        });
        console.log('✅ Role updated to SUPER_ADMIN');
      } else {
        console.log(`✅ User already has SUPER_ADMIN role`);
      }
    }

    // Verify final state
    const finalUser = await prisma.user.findUnique({
      where: { email },
      include: { profile: true }
    });

    console.log(`\n🎉 Setup complete!`);
    console.log(`📧 Email: ${finalUser?.email}`);
    console.log(`👤 Role: ${finalUser?.profile?.role}`);
    console.log(`✅ ${email} is now SUPER_ADMIN`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
