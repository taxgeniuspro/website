/**
 * Seed Commission Settings
 *
 * Initializes the company-wide default commission tiers in the SystemSettings table.
 * Run with: npx ts-node scripts/seed-commission-settings.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMMISSION_DEFAULTS_KEY = 'commission_default_tiers';

// Default company tiers (matching original hardcoded values)
const DEFAULT_TIERS = [
  { max: 5, rate: 50 },   // Referrals 1-5: $50 each
  { max: 10, rate: 75 },  // Referrals 6-10: $75 each
  { max: null, rate: 100 }, // Referrals 11+: $100 each
];

async function main() {
  console.log('Seeding commission settings...\n');

  // Check if setting already exists
  const existing = await prisma.systemSettings.findUnique({
    where: { key: COMMISSION_DEFAULTS_KEY },
  });

  if (existing) {
    console.log(`Setting '${COMMISSION_DEFAULTS_KEY}' already exists.`);
    console.log(`Current value: ${existing.value}`);
    console.log('\nTo update, use the admin dashboard at /admin/commission-settings');
    return;
  }

  // Create the setting
  const setting = await prisma.systemSettings.create({
    data: {
      key: COMMISSION_DEFAULTS_KEY,
      value: JSON.stringify(DEFAULT_TIERS),
      category: 'commission',
      description: 'Company-wide default commission tier structure for referrals. Array of tiers with max (upper limit, null=unlimited) and rate (dollar amount per referral).',
    },
  });

  console.log(`Created setting: ${setting.key}`);
  console.log(`Category: ${setting.category}`);
  console.log(`Value: ${setting.value}`);
  console.log(`\nDefault tiers:`);
  DEFAULT_TIERS.forEach((tier, i) => {
    const min = i === 0 ? 1 : (DEFAULT_TIERS[i - 1].max ?? 0) + 1;
    const maxDisplay = tier.max === null ? '+' : tier.max;
    console.log(`  Tier ${i + 1}: Referrals ${min}-${maxDisplay} = $${tier.rate}/referral`);
  });

  console.log('\nCommission settings seeded successfully!');
  console.log('Admin can modify at: /admin/commission-settings');
}

main()
  .catch((e) => {
    console.error('Error seeding commission settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
