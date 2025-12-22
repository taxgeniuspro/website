/**
 * Check Tax Preparer Signups Script
 *
 * This script checks which tax preparers from the activation email campaign
 * have signed up (created accounts) today.
 *
 * Usage:
 *   npx tsx scripts/check-signups-today.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All 30 preparers who received activation emails
const emailedPreparers = [
  { firstName: 'Alicia', lastName: 'Adams', code: 'aa', email: 'caydensmother29@gmail.com' },
  { firstName: 'Angela', lastName: 'Richards', code: 'ar', email: 'angeladesigndocs@gmail.com' },
  { firstName: 'Anita', lastName: 'Wilson', code: 'aw', email: 'anita@cm3mediagroup.pro' },
  { firstName: 'Brandon', lastName: 'Hawkins', code: 'bh', email: 'busyb101@gmail.com' },
  { firstName: 'Carlton', lastName: 'Gannaway', code: 'cg', email: 'f.alawishez@gmail.com' },
  { firstName: 'Ceia', lastName: 'Stewart', code: 'cs', email: 'consult.me@mail.com' },
  { firstName: 'Chelsea', lastName: 'Lowe', code: 'cl', email: 'c.mitchell.lowe@gmail.com' },
  { firstName: 'Cynthia', lastName: 'Bacon-Whitted', code: 'cbw', email: 'cbawhitted@gmail.com' },
  { firstName: 'Derrick', lastName: 'Stewart', code: 'ds', email: 'derrick.stewart31@yahoo.com' },
  { firstName: 'Devlin', lastName: 'Watkins', code: 'dw', email: 'iradwatkins+dw@gmail.com' },
  { firstName: 'Devon', lastName: 'Hamilton', code: 'dh', email: 'gxldmxb@gmail.com' },
  { firstName: 'Erica', lastName: 'Bridges', code: 'eb', email: 'msboss110284@gmail.com' },
  { firstName: 'Gregory', lastName: 'Edwards', code: 'ge', email: 'gregthetaxgenius@gmail.com' },
  { firstName: 'Helen', lastName: 'Holmes', code: 'hh', email: 'holmeshelen@yahoo.com' },
  { firstName: 'Iran', lastName: 'Watkins', code: 'iw1', email: 'iradwatkins+iw1@gmail.com' },
  { firstName: 'Jamel', lastName: 'Pringle', code: 'jp', email: 'melpringle38@gmail.com' },
  { firstName: 'Javarre', lastName: 'Massey', code: 'jm', email: 'javareemassey@gmail.com' },
  { firstName: 'Katie', lastName: 'Winborn', code: 'kw', email: 'winbornkatie@gmail.com' },
  { firstName: 'Kemnetta', lastName: 'Pillette', code: 'kp', email: 'kpillette7@gmail.com' },
  { firstName: 'LaJuana', lastName: 'Frost', code: 'lf', email: 'lajuanafrost@gmail.com' },
  { firstName: 'Lenore', lastName: 'Bohanon', code: 'lb', email: 'lbohanon398@gmail.com' },
  { firstName: 'Mariah', lastName: 'Johnson', code: 'mj', email: 'msj1solution@gmail.com' },
  { firstName: 'Michael', lastName: 'Finley', code: 'mf', email: 'mrmikefinley@gmail.com' },
  { firstName: 'Pamela', lastName: 'Johnson', code: 'pj', email: 'pamelajatl3@gmail.com' },
  { firstName: 'Sarah', lastName: 'Wilson', code: 'sw', email: 'hest8133@bellsouth.net' },
  { firstName: 'Shakia', lastName: 'Gibbs', code: 'sj', email: 'shakiragibbs12@gmail.com' },
  { firstName: 'Tiffany & Jakobe', lastName: 'Pearson', code: 'tp', email: 'jakobepearson18@gmail.com' },
  { firstName: 'Trevor', lastName: 'Wikerson', code: 'tw', email: 'tjbw2005@gmail.com' },
  { firstName: 'Wendy', lastName: 'Casimir', code: 'wc', email: 'wendycasimir@gmail.com' },
  { firstName: 'Yaumar', lastName: 'Williams', code: 'yw', email: 'yaumarwilliams@gmail.com' },
];

async function checkSignups() {
  const now = new Date();
  console.log('=== TAX PREPARER SIGNUP CHECK ===');
  console.log(`Report generated: ${now.toLocaleString()}\n`);

  // Get today's start time (midnight)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const signedUp: Array<{ name: string; email: string; code: string; signedUpAt: Date }> = [];
  const notSignedUp: Array<{ name: string; email: string; code: string }> = [];

  for (const preparer of emailedPreparers) {
    // Check if user exists with this email
    const user = await prisma.user.findUnique({
      where: { email: preparer.email },
      include: {
        profile: true,
      },
    });

    if (user) {
      signedUp.push({
        name: `${preparer.firstName} ${preparer.lastName}`,
        email: preparer.email,
        code: preparer.code,
        signedUpAt: user.createdAt,
      });
    } else {
      notSignedUp.push({
        name: `${preparer.firstName} ${preparer.lastName}`,
        email: preparer.email,
        code: preparer.code,
      });
    }
  }

  // Check for signups today specifically
  const signedUpToday = signedUp.filter(p => p.signedUpAt >= todayStart);

  // Summary
  console.log('=== SUMMARY ===\n');
  console.log(`Total preparers emailed: ${emailedPreparers.length}`);
  console.log(`Signed up (all time): ${signedUp.length}`);
  console.log(`Signed up TODAY: ${signedUpToday.length}`);
  console.log(`Not yet signed up: ${notSignedUp.length}`);

  // Signed up today
  if (signedUpToday.length > 0) {
    console.log('\n=== ✅ SIGNED UP TODAY ===\n');
    signedUpToday.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.code})`);
      console.log(`   Email: ${p.email}`);
      console.log(`   Signed up at: ${p.signedUpAt.toLocaleString()}`);
    });
  }

  // Already had accounts before today
  const signedUpBefore = signedUp.filter(p => p.signedUpAt < todayStart);
  if (signedUpBefore.length > 0) {
    console.log('\n=== 📋 ALREADY HAD ACCOUNTS (before today) ===\n');
    signedUpBefore.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.code}) - ${p.email}`);
      console.log(`   Account created: ${p.signedUpAt.toLocaleString()}`);
    });
  }

  // Not signed up yet
  if (notSignedUp.length > 0) {
    console.log('\n=== ❌ NOT YET SIGNED UP ===\n');
    notSignedUp.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} (${p.code}) - ${p.email}`);
    });
  }

  // Stats for quick view
  console.log('\n=== QUICK STATS ===\n');
  console.log(`📧 Emails sent: 30`);
  console.log(`✅ New signups today: ${signedUpToday.length}`);
  console.log(`📊 Conversion rate (today): ${((signedUpToday.length / emailedPreparers.length) * 100).toFixed(1)}%`);
  console.log(`⏳ Still waiting on: ${notSignedUp.length} preparers`);

  await prisma.$disconnect();
}

checkSignups().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
