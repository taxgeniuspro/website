import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGoogleAccounts() {
  // Get all users with Google accounts
  const googleAccounts = await prisma.account.findMany({
    where: {
      provider: 'google'
    },
    include: {
      user: {
        include: {
          profile: {
            select: {
              role: true,
              firstName: true,
              lastName: true,
            }
          }
        }
      }
    }
  });

  console.log('=== Users with Google OAuth Linked ===\n');

  for (const account of googleAccounts) {
    const user = account.user;
    const firstName = user.profile?.firstName || '';
    const lastName = user.profile?.lastName || '';
    const name = (firstName + ' ' + lastName).trim() || user.name || 'Unknown';
    const role = user.profile?.role || 'no profile';

    console.log('Email: ' + user.email);
    console.log('  Name: ' + name);
    console.log('  Role: ' + role);
    console.log('  Google Account ID: ' + account.providerAccountId);
    console.log('  Has Password: ' + (user.hashedPassword ? 'Yes' : 'No'));
    console.log('');
  }

  // Check for users who might be having login issues
  // (users who exist with email but without Google linked)
  const potentialIssueUsers = await prisma.user.findMany({
    where: {
      AND: [
        { email: { contains: 'gmail.com' } },
        { accounts: { none: { provider: 'google' } } }
      ]
    },
    include: {
      profile: {
        select: {
          role: true,
          firstName: true,
          lastName: true,
        }
      }
    },
    take: 20
  });

  console.log('\n=== Gmail Users WITHOUT Google OAuth Linked ===');
  console.log('(These users may get OAuthAccountNotLinked error)\n');

  for (const user of potentialIssueUsers) {
    const firstName = user.profile?.firstName || '';
    const lastName = user.profile?.lastName || '';
    const name = (firstName + ' ' + lastName).trim() || user.name || 'Unknown';
    const role = user.profile?.role || 'no profile';

    console.log('Email: ' + user.email);
    console.log('  Name: ' + name);
    console.log('  Role: ' + role);
    console.log('  Has Password: ' + (user.hashedPassword ? 'Yes' : 'No'));
    console.log('');
  }

  await prisma.$disconnect();
}

checkGoogleAccounts().catch(console.error);
