import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2] || 'whitegelisa@gmail.com';

  console.log('='.repeat(80));
  console.log('CHECK USER PROFILE');
  console.log('Email:', email);
  console.log('='.repeat(80));

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    console.log('❌ User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('\nUser:');
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);

  // Find profile by userId
  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      customTrackingCode: true,
    },
  });

  if (!profile) {
    console.log('\n❌ Profile not found for this user');
    console.log('   This is a problem - the CRM API route will fail to find preparerId');
  } else {
    console.log('\nProfile:');
    console.log(`  Profile.id: ${profile.id}`);
    console.log(`  User.id: ${profile.userId}`);
    console.log(`  Name: ${profile.firstName} ${profile.lastName}`);
    console.log(`  Tracking Code: ${profile.customTrackingCode}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
