/**
 * Test Tier Progression
 *
 * Tests that commission tiers progress correctly:
 * - Tier 1: Referrals 1-5 at $50 each
 * - Tier 2: Referrals 6-10 at $75 each
 * - Tier 3: Referrals 11+ at $100 each
 *
 * Run: npx tsx scripts/test-tier-progression.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TIER PROGRESSION TEST');
  console.log('='.repeat(70));

  try {
    const { calculateReferrerCommission, COMPANY_DEFAULT_TIERS } = await import(
      '../src/lib/services/tiered-commission.service'
    );

    console.log('\nCompany Default Tiers:');
    console.log(`  Tier 1: 1-${COMPANY_DEFAULT_TIERS.tier1.max} referrals at $${COMPANY_DEFAULT_TIERS.tier1.rate} each`);
    console.log(`  Tier 2: ${COMPANY_DEFAULT_TIERS.tier1.max + 1}-${COMPANY_DEFAULT_TIERS.tier2.max} referrals at $${COMPANY_DEFAULT_TIERS.tier2.rate} each`);
    console.log(`  Tier 3: ${COMPANY_DEFAULT_TIERS.tier2.max + 1}+ referrals at $${COMPANY_DEFAULT_TIERS.tier3.rate} each`);

    // Get test preparer and referrer
    const preparer = await prisma.profile.findFirst({
      where: { user: { email: 'whitegelisa@gmail.com' } },
    });

    const referrer = await prisma.profile.findFirst({
      where: { customTrackingCode: 'ge' },
    });

    if (!preparer || !referrer) {
      throw new Error('Preparer or referrer not found');
    }

    console.log(`\nTesting with:`);
    console.log(`  Preparer: ${preparer.firstName} ${preparer.lastName}`);
    console.log(`  Referrer: ${referrer.firstName} ${referrer.lastName}`);
    console.log(`  Use Company Defaults: ${preparer.useCompanyCommissionDefaults}`);

    console.log('\n' + '-'.repeat(50));
    console.log('Testing Tier Progression:');
    console.log('-'.repeat(50));

    const testCases = [
      { referralNum: 1, expectedTier: 'Tier 1', expectedRate: 50 },
      { referralNum: 3, expectedTier: 'Tier 1', expectedRate: 50 },
      { referralNum: 5, expectedTier: 'Tier 1', expectedRate: 50 },
      { referralNum: 6, expectedTier: 'Tier 2', expectedRate: 75 },
      { referralNum: 8, expectedTier: 'Tier 2', expectedRate: 75 },
      { referralNum: 10, expectedTier: 'Tier 2', expectedRate: 75 },
      { referralNum: 11, expectedTier: 'Tier 3', expectedRate: 100 },
      { referralNum: 15, expectedTier: 'Tier 3', expectedRate: 100 },
      { referralNum: 100, expectedTier: 'Tier 3', expectedRate: 100 },
    ];

    let allPassed = true;
    let totalEarnings = 0;

    for (const tc of testCases) {
      const result = await calculateReferrerCommission(
        preparer.id,
        referrer.id,
        tc.referralNum
      );

      const passed = result.amount === tc.expectedRate && result.tier === tc.expectedTier;

      if (!passed) {
        allPassed = false;
        console.log(`❌ Referral #${tc.referralNum}:`);
        console.log(`   Expected: $${tc.expectedRate} (${tc.expectedTier})`);
        console.log(`   Got: $${result.amount} (${result.tier})`);
      } else {
        console.log(`✅ Referral #${tc.referralNum}: $${result.amount} (${result.tier})`);
      }
    }

    // Calculate total earnings for 15 referrals
    console.log('\n' + '-'.repeat(50));
    console.log('Total Earnings Calculation (15 referrals):');
    console.log('-'.repeat(50));

    let runningTotal = 0;
    for (let i = 1; i <= 15; i++) {
      const result = await calculateReferrerCommission(preparer.id, referrer.id, i);
      runningTotal += result.amount;
    }

    // Expected: 5 × $50 + 5 × $75 + 5 × $100 = $250 + $375 + $500 = $1125
    const expectedTotal = (5 * 50) + (5 * 75) + (5 * 100);

    console.log(`\nTier 1 (1-5):   5 × $50  = $${5 * 50}`);
    console.log(`Tier 2 (6-10):  5 × $75  = $${5 * 75}`);
    console.log(`Tier 3 (11-15): 5 × $100 = $${5 * 100}`);
    console.log(`${'─'.repeat(30)}`);
    console.log(`Total:          ${runningTotal === expectedTotal ? '✅' : '❌'} $${runningTotal} (expected $${expectedTotal})`);

    console.log('\n' + '='.repeat(70));
    if (allPassed && runningTotal === expectedTotal) {
      console.log('🎉 ALL TIER PROGRESSION TESTS PASSED');
    } else {
      console.log('⚠️  SOME TESTS FAILED');
    }
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
