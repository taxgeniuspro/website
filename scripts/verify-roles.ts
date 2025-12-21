/**
 * Verify Tax Preparer Roles Script
 *
 * This script verifies that all 35 expected tax preparers have the correct role assigned.
 * Run with: npx tsx scripts/verify-roles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Expected tax preparers from CLAUDE.md
const EXPECTED_PREPARERS = [
  { email: 'goldenprotaxes@gmail.com', name: 'Ale Hamilton', code: 'ah' },
  { email: 'caydensmother29@gmail.com', name: 'Alicia Adams', code: 'aa' },
  { email: 'angeladesigndocs@gmail.com', name: 'Angela Richards', code: 'ar' },
  { email: 'anita@cm3mediagroup.pro', name: 'Anita Wilson', code: 'aw' },
  { email: 'busyb101@gmail.com', name: 'Brandon Hawkins', code: 'bh' },
  { email: 'f.alawishez@gmail.com', name: 'Carlton Gannaway', code: 'cg' },
  { email: 'consult.me@mail.com', name: 'Ceia Stewart', code: 'cs' },
  { email: 'c.mitchell.lowe@gmail.com', name: 'Chelsea Lowe', code: 'cl' },
  { email: 'cbawhitted@gmail.com', name: 'Cynthia Bacon-whitted', code: 'cbw' },
  { email: 'derrick.stewart31@yahoo.com', name: 'Derrick Stewart', code: 'ds' },
  { email: 'iradwatkins+dw@gmail.com', name: 'Devlin Watkins', code: 'dw' },
  { email: 'gxldmxb@gmail.com', name: 'Devon Hamilton', code: 'dh' },
  { email: 'msboss110284@gmail.com', name: 'Erica Bridges', code: 'eb' },
  { email: 'whitegelisa@gmail.com', name: 'Gelisa White', code: 'gw' },
  { email: 'gregthetaxgenius@gmail.com', name: 'Gregory Edwards', code: 'ge' },
  { email: 'holmeshelen@yahoo.com', name: 'Helen Holmes', code: 'hh' },
  { email: 'iradwatkins@gmail.com', name: 'Ira Watkins', code: 'iw' },
  { email: 'iradwatkins+iw1@gmail.com', name: 'Iran Watkins', code: 'iw1' },
  { email: 'melpringle38@gmail.com', name: 'Jamel Pringle', code: 'jp' },
  { email: 'javareemassey@gmail.com', name: 'Javarre Massey', code: 'jm' },
  { email: 'winbornkatie@gmail.com', name: 'Katie Winborn', code: 'kw' },
  { email: 'kpillette7@gmail.com', name: 'Kemnetta Pillette', code: 'kp' },
  { email: 'lajuanafrost@gmail.com', name: 'LaJuana Frost', code: 'lf' },
  { email: 'lbohanon398@gmail.com', name: 'Lenore Bohanon', code: 'lb' },
  { email: 'msj1solution@gmail.com', name: 'Mariah Johnson', code: 'mj' },
  { email: 'mrmikefinley@gmail.com', name: 'Michael Finley', code: 'mf' },
  { email: 'taxgenius.tax@gmail.com', name: 'Owliver Owl', code: 'ow' },
  { email: 'pamelajatl3@gmail.com', name: 'Pamela Johnson', code: 'pj' },
  { email: 'rhamiltonfirm@gmail.com', name: 'Ray Hamilton', code: 'rh' },
  { email: 'hest8133@bellsouth.net', name: 'Sarah Wilson', code: 'sw' },
  { email: 'shakiragibbs12@gmail.com', name: 'Shakia JGibbs', code: 'sj' },
  { email: 'jakobepearson18@gmail.com', name: 'Tiffany & Jakobe Pearson', code: 'tp' },
  { email: 'tjbw2005@gmail.com', name: 'Trevor Wikerson', code: 'tw' },
  { email: 'wendycasimir@gmail.com', name: 'Wendy Casimir', code: 'wc' },
  { email: 'yaumarwilliams@gmail.com', name: 'Yaumar Williams', code: 'yw' },
];

interface VerificationResult {
  email: string;
  name: string;
  code: string;
  status: 'correct' | 'wrong_role' | 'no_profile' | 'no_user';
  currentRole?: string | null;
  userId?: string;
  profileId?: string;
}

async function verifyRoles(): Promise<void> {
  console.log('='.repeat(80));
  console.log('Tax Preparer Role Verification');
  console.log('='.repeat(80));
  console.log(`Expected preparers: ${EXPECTED_PREPARERS.length}\n`);

  const results: VerificationResult[] = [];

  for (const preparer of EXPECTED_PREPARERS) {
    // Find user by email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: preparer.email,
          mode: 'insensitive',
        },
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      results.push({
        ...preparer,
        status: 'no_user',
      });
      continue;
    }

    if (!user.profile) {
      results.push({
        ...preparer,
        status: 'no_profile',
        userId: user.id,
      });
      continue;
    }

    if (user.profile.role !== 'tax_preparer') {
      results.push({
        ...preparer,
        status: 'wrong_role',
        currentRole: user.profile.role,
        userId: user.id,
        profileId: user.profile.id,
      });
      continue;
    }

    results.push({
      ...preparer,
      status: 'correct',
      currentRole: user.profile.role,
      userId: user.id,
      profileId: user.profile.id,
    });
  }

  // Group results by status
  const correct = results.filter((r) => r.status === 'correct');
  const wrongRole = results.filter((r) => r.status === 'wrong_role');
  const noProfile = results.filter((r) => r.status === 'no_profile');
  const noUser = results.filter((r) => r.status === 'no_user');

  // Print correct preparers
  console.log(`\n${'='.repeat(40)}`);
  console.log(`CORRECT ROLES (${correct.length}/${EXPECTED_PREPARERS.length})`);
  console.log('='.repeat(40));
  for (const r of correct) {
    console.log(`  ✅ ${r.name} (${r.email}) - ${r.currentRole}`);
  }

  // Print wrong roles
  if (wrongRole.length > 0) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`WRONG ROLE (${wrongRole.length})`);
    console.log('='.repeat(40));
    for (const r of wrongRole) {
      console.log(`  ❌ ${r.name} (${r.email})`);
      console.log(`     Current role: ${r.currentRole} (should be: tax_preparer)`);
      console.log(`     User ID: ${r.userId}`);
      console.log(`     Profile ID: ${r.profileId}`);
    }
  }

  // Print no profile
  if (noProfile.length > 0) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`NO PROFILE (${noProfile.length})`);
    console.log('='.repeat(40));
    for (const r of noProfile) {
      console.log(`  ⚠️  ${r.name} (${r.email})`);
      console.log(`     User ID: ${r.userId}`);
      console.log(`     Action: Create profile with role = tax_preparer`);
    }
  }

  // Print no user
  if (noUser.length > 0) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`NO USER ACCOUNT (${noUser.length})`);
    console.log('='.repeat(40));
    for (const r of noUser) {
      console.log(`  ⚠️  ${r.name} (${r.email})`);
      console.log(`     Action: User needs to sign up first`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total expected: ${EXPECTED_PREPARERS.length}`);
  console.log(`Correct role:   ${correct.length}`);
  console.log(`Wrong role:     ${wrongRole.length}`);
  console.log(`No profile:     ${noProfile.length}`);
  console.log(`No user:        ${noUser.length}`);
  console.log('='.repeat(80));

  // Also check for any users with tax_preparer role that aren't in our list
  console.log('\nChecking for unexpected tax_preparer roles...');
  const allTaxPreparers = await prisma.profile.findMany({
    where: { role: 'tax_preparer' },
    include: {
      user: {
        select: { email: true, name: true },
      },
    },
  });

  const expectedEmails = EXPECTED_PREPARERS.map((p) => p.email.toLowerCase());
  const unexpected = allTaxPreparers.filter(
    (p) => !expectedEmails.includes(p.user.email.toLowerCase())
  );

  if (unexpected.length > 0) {
    console.log(`\n${'='.repeat(40)}`);
    console.log(`UNEXPECTED TAX PREPARERS (${unexpected.length})`);
    console.log('='.repeat(40));
    for (const p of unexpected) {
      console.log(`  ❓ ${p.user.name || 'Unknown'} (${p.user.email})`);
      console.log(`     Profile ID: ${p.id}`);
    }
  } else {
    console.log('No unexpected tax_preparer roles found.');
  }

  // Generate fix commands for wrong roles
  if (wrongRole.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('FIX COMMANDS (Run these to correct roles)');
    console.log('='.repeat(80));
    for (const r of wrongRole) {
      console.log(`\n// Fix ${r.name}`);
      console.log(`await prisma.profile.update({`);
      console.log(`  where: { id: '${r.profileId}' },`);
      console.log(`  data: { role: 'tax_preparer' },`);
      console.log(`});`);
    }
  }

  // Generate fix commands for no profile
  if (noProfile.length > 0) {
    console.log(`\n${'='.repeat(80)}`);
    console.log('CREATE PROFILE COMMANDS');
    console.log('='.repeat(80));
    for (const r of noProfile) {
      const nameParts = r.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      console.log(`\n// Create profile for ${r.name}`);
      console.log(`await prisma.profile.create({`);
      console.log(`  data: {`);
      console.log(`    userId: '${r.userId}',`);
      console.log(`    role: 'tax_preparer',`);
      console.log(`    firstName: '${firstName}',`);
      console.log(`    lastName: '${lastName}',`);
      console.log(`    affiliateStatus: 'APPROVED',`);
      console.log(`    affiliateApprovedAt: new Date(),`);
      console.log(`  },`);
      console.log(`});`);
    }
  }
}

async function main(): Promise<void> {
  try {
    await verifyRoles();
  } catch (error) {
    console.error('Error running verification:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
