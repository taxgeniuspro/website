import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAuthDifference() {
  // Compare iradwatkins@gmail.com (working) vs another user (not working)

  console.log('=== Comparing Working vs Non-Working User ===\n');

  // Get the working user
  const workingUser = await prisma.user.findUnique({
    where: { email: 'iradwatkins@gmail.com' },
    include: {
      accounts: true,
      profile: true,
    }
  });

  // Get a non-working user (someone who gets OAuthAccountNotLinked)
  const nonWorkingUser = await prisma.user.findUnique({
    where: { email: 'rhamiltonfirm@gmail.com' },
    include: {
      accounts: true,
      profile: true,
    }
  });

  console.log('=== WORKING USER: iradwatkins@gmail.com ===');
  if (workingUser) {
    console.log('User ID:', workingUser.id);
    console.log('Email:', workingUser.email);
    console.log('Name:', workingUser.name);
    console.log('Email Verified:', workingUser.emailVerified);
    console.log('Has Password:', !!workingUser.hashedPassword);
    console.log('Created At:', workingUser.createdAt);
    console.log('Updated At:', workingUser.updatedAt);
    console.log('');
    console.log('Profile:');
    if (workingUser.profile) {
      console.log('  Profile ID:', workingUser.profile.id);
      console.log('  Role:', workingUser.profile.role);
      console.log('  First Name:', workingUser.profile.firstName);
      console.log('  Last Name:', workingUser.profile.lastName);
      console.log('  Is Active:', workingUser.profile.isActive);
    } else {
      console.log('  NO PROFILE');
    }
    console.log('');
    console.log('Accounts (' + workingUser.accounts.length + '):');
    for (const acc of workingUser.accounts) {
      console.log('  Provider:', acc.provider);
      console.log('  Provider Account ID:', acc.providerAccountId);
      console.log('  Type:', acc.type);
      console.log('  Created At:', acc.createdAt);
      console.log('  ---');
    }
  } else {
    console.log('USER NOT FOUND');
  }

  console.log('\n\n=== NON-WORKING USER: rhamiltonfirm@gmail.com ===');
  if (nonWorkingUser) {
    console.log('User ID:', nonWorkingUser.id);
    console.log('Email:', nonWorkingUser.email);
    console.log('Name:', nonWorkingUser.name);
    console.log('Email Verified:', nonWorkingUser.emailVerified);
    console.log('Has Password:', !!nonWorkingUser.hashedPassword);
    console.log('Created At:', nonWorkingUser.createdAt);
    console.log('Updated At:', nonWorkingUser.updatedAt);
    console.log('');
    console.log('Profile:');
    if (nonWorkingUser.profile) {
      console.log('  Profile ID:', nonWorkingUser.profile.id);
      console.log('  Role:', nonWorkingUser.profile.role);
      console.log('  First Name:', nonWorkingUser.profile.firstName);
      console.log('  Last Name:', nonWorkingUser.profile.lastName);
      console.log('  Is Active:', nonWorkingUser.profile.isActive);
    } else {
      console.log('  NO PROFILE');
    }
    console.log('');
    console.log('Accounts (' + nonWorkingUser.accounts.length + '):');
    for (const acc of nonWorkingUser.accounts) {
      console.log('  Provider:', acc.provider);
      console.log('  Provider Account ID:', acc.providerAccountId);
      console.log('  Type:', acc.type);
      console.log('  Created At:', acc.createdAt);
      console.log('  ---');
    }
    if (nonWorkingUser.accounts.length === 0) {
      console.log('  NO ACCOUNTS LINKED');
    }
  } else {
    console.log('USER NOT FOUND');
  }

  // Check the schema to understand the relationship
  console.log('\n\n=== Database Schema Check ===');

  // Check for any unique constraints that might cause issues
  const accountSchema = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'accounts'
    ORDER BY ordinal_position
  `;
  console.log('\nAccounts table columns:');
  console.log(accountSchema);

  // Check unique constraints on accounts
  const accountConstraints = await prisma.$queryRaw`
    SELECT constraint_name, constraint_type
    FROM information_schema.table_constraints
    WHERE table_name = 'accounts'
  `;
  console.log('\nAccounts table constraints:');
  console.log(accountConstraints);

  await prisma.$disconnect();
}

debugAuthDifference().catch(console.error);
