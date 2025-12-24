import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeConflictingAccount() {
  const email = 'iradwatkins+agi@gmail.com';
  
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accounts: true,
      profile: true,
    }
  });
  
  if (!user) {
    console.log('User not found:', email);
    return;
  }
  
  console.log('Found user:', {
    id: user.id,
    email: user.email,
    accounts: user.accounts.map(a => ({ provider: a.provider, type: a.type })),
    hasProfile: !!user.profile
  });
  
  // Delete related records first
  if (user.profile) {
    await prisma.profile.delete({ where: { userId: user.id } });
    console.log('Deleted profile');
  }
  
  // Delete accounts
  await prisma.account.deleteMany({ where: { userId: user.id } });
  console.log('Deleted accounts');
  
  // Delete verification tokens
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  console.log('Deleted verification tokens');
  
  // Delete the user
  await prisma.user.delete({ where: { id: user.id } });
  console.log('Deleted user:', email);
}

removeConflictingAccount()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
