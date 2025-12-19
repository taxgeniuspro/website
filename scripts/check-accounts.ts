import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAccounts() {
  // Get all users with their accounts
  const users = await prisma.user.findMany({
    include: {
      accounts: {
        select: {
          provider: true,
          providerAccountId: true,
        }
      },
      profile: {
        select: {
          role: true,
          firstName: true,
          lastName: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  console.log('=== Recent Users and Their Auth Methods ===\n');

  for (const user of users) {
    const providers = user.accounts.map(a => a.provider).join(', ') || 'No linked accounts (email only)';
    const firstName = user.profile?.firstName || '';
    const lastName = user.profile?.lastName || '';
    const name = (firstName + ' ' + lastName).trim() || user.name || 'Unknown';
    const role = user.profile?.role || 'no profile';

    console.log('Email: ' + user.email);
    console.log('  Name: ' + name);
    console.log('  Role: ' + role);
    console.log('  Auth Methods: ' + providers);
    console.log('  Has Password: ' + (user.hashedPassword ? 'Yes' : 'No'));
    console.log('');
  }

  // Count by provider
  const accountCounts = await prisma.account.groupBy({
    by: ['provider'],
    _count: { provider: true },
  });

  console.log('=== Account Counts by Provider ===');
  for (const count of accountCounts) {
    console.log('  ' + count.provider + ': ' + count._count.provider);
  }

  // Users with email but no accounts (Magic Link or Credentials users)
  const usersWithoutAccounts = await prisma.user.count({
    where: {
      accounts: {
        none: {}
      }
    }
  });
  console.log('\nUsers with no linked OAuth accounts: ' + usersWithoutAccounts);

  await prisma.$disconnect();
}

checkAccounts().catch(console.error);
