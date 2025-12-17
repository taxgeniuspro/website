import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminAccount() {
  const user = await prisma.user.findUnique({
    where: { email: 'iradwatkins@gmail.com' },
    include: { profile: true }
  });

  if (user) {
    console.log('User found:');
    console.log('  ID:', user.id);
    console.log('  Email:', user.email);
    console.log('  Has password:', user.hashedPassword ? 'YES' : 'NO');
    console.log('  Password hash length:', user.hashedPassword?.length || 0);
    console.log('  Is Active:', user.isActive);
    console.log('  Role:', user.profile?.role);
    console.log('  Created:', user.createdAt);

    // Check if password starts with $2 (bcrypt hash)
    if (user.hashedPassword) {
      console.log('  Password format:', user.hashedPassword.startsWith('$2') ? 'bcrypt' : 'unknown');
    }
  } else {
    console.log('User not found: iradwatkins@gmail.com');
  }

  // Also check the tax preparer test account
  const preparer = await prisma.user.findUnique({
    where: { email: 'whitegelisa@gmail.com' },
    include: { profile: true }
  });

  if (preparer) {
    console.log('\nTax Preparer account:');
    console.log('  ID:', preparer.id);
    console.log('  Email:', preparer.email);
    console.log('  Has password:', preparer.hashedPassword ? 'YES' : 'NO');
    console.log('  Role:', preparer.profile?.role);
  }

  await prisma.$disconnect();
}

checkAdminAccount().catch(console.error);
