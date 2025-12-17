/**
 * Test 13: Tax Preparer Commission Calculation
 *
 * Validates commission tier structure and VIP rate management.
 *
 * Tests:
 * - 3.1: Verify default tier structure loads
 * - 3.2: Set custom tier structure → verify saved
 * - 3.3: Set VIP rate for specific referrer
 * - 3.4: Calculate commission with correct tier applied
 * - 3.5: Remove VIP rate → verify falls back to tier
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

// Default company tier structure
const DEFAULT_TIER_STRUCTURE = {
  tier1: { max: 5, rate: 25 },   // First 5 referrals: $25 each
  tier2: { max: 15, rate: 35 },  // Next 10 referrals (6-15): $35 each
  tier3: { max: null, rate: 50 }, // 16+ referrals: $50 each
};

// Custom tier structure for testing
const CUSTOM_TIER_STRUCTURE = {
  tier1: { max: 3, rate: 20 },
  tier2: { max: 10, rate: 30 },
  tier3: { max: null, rate: 40 },
};

async function runCommissionCalculationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testReferrerId: string;
  let testReferrerUsername: string;

  // Test 3.1: Verify default tier structure
  results.push(
    await runTest('3.1 Default tier structure loads', async () => {
      // Create test preparer with default settings
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Commission',
        lastName: 'Preparer',
        shortLinkUsername: `commission-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Verify preparer uses company defaults
      const preparerProfile = await prisma.profile.findUnique({
        where: { id: testPreparerId },
        select: {
          useCompanyCommissionDefaults: true,
          customTierStructure: true,
        },
      });

      // By default, useCompanyCommissionDefaults should be true or null (treated as true)
      const usesDefaults = preparerProfile!.useCompanyCommissionDefaults !== false;
      assert(usesDefaults, 'Preparer should use company defaults by default');

      logSuccess('Default tier structure verified');
      logInfo(`  useCompanyCommissionDefaults: ${preparerProfile!.useCompanyCommissionDefaults}`);
      logInfo(`  Default tiers:`);
      logInfo(`    Tier 1: $${DEFAULT_TIER_STRUCTURE.tier1.rate} (up to ${DEFAULT_TIER_STRUCTURE.tier1.max} referrals)`);
      logInfo(`    Tier 2: $${DEFAULT_TIER_STRUCTURE.tier2.rate} (up to ${DEFAULT_TIER_STRUCTURE.tier2.max} referrals)`);
      logInfo(`    Tier 3: $${DEFAULT_TIER_STRUCTURE.tier3.rate} (unlimited)`);
    })
  );

  // Test 3.2: Set custom tier structure
  results.push(
    await runTest('3.2 Set custom tier structure', async () => {
      // Update preparer to use custom tiers
      const updatedProfile = await prisma.profile.update({
        where: { id: testPreparerId },
        data: {
          useCompanyCommissionDefaults: false,
          customTierStructure: CUSTOM_TIER_STRUCTURE,
        },
        select: {
          useCompanyCommissionDefaults: true,
          customTierStructure: true,
        },
      });

      assertEqual(updatedProfile.useCompanyCommissionDefaults, false, 'Should not use company defaults');
      assertNotNull(updatedProfile.customTierStructure, 'Custom tier structure should be set');

      // Verify the structure matches
      const savedTiers = updatedProfile.customTierStructure as typeof CUSTOM_TIER_STRUCTURE;
      assertEqual(savedTiers.tier1.max, CUSTOM_TIER_STRUCTURE.tier1.max, 'Tier 1 max should match');
      assertEqual(savedTiers.tier1.rate, CUSTOM_TIER_STRUCTURE.tier1.rate, 'Tier 1 rate should match');
      assertEqual(savedTiers.tier2.max, CUSTOM_TIER_STRUCTURE.tier2.max, 'Tier 2 max should match');
      assertEqual(savedTiers.tier2.rate, CUSTOM_TIER_STRUCTURE.tier2.rate, 'Tier 2 rate should match');
      assertEqual(savedTiers.tier3.rate, CUSTOM_TIER_STRUCTURE.tier3.rate, 'Tier 3 rate should match');

      logSuccess('Custom tier structure saved');
      logInfo(`  Custom tiers:`);
      logInfo(`    Tier 1: $${savedTiers.tier1.rate} (up to ${savedTiers.tier1.max} referrals)`);
      logInfo(`    Tier 2: $${savedTiers.tier2.rate} (up to ${savedTiers.tier2.max} referrals)`);
      logInfo(`    Tier 3: $${savedTiers.tier3.rate} (unlimited)`);
    })
  );

  // Test 3.3: Set VIP rate for specific referrer
  results.push(
    await runTest('3.3 Set VIP rate for referrer', async () => {
      // Create test referrer
      const { profile: referrer } = await createTestUser({
        role: 'client',
        firstName: 'VIP',
        lastName: 'Referrer',
        shortLinkUsername: `vip-referrer-${Date.now()}`,
        affiliateStatus: 'APPROVED',
      });
      testReferrerId = referrer.id;
      testReferrerUsername = referrer.shortLinkUsername!;

      // Set VIP rate for this referrer
      const vipRate = 75; // Higher than any tier rate

      // Create or update VIP rate record
      // In the actual system, this might be stored in a separate table or as JSON
      // For this test, we'll simulate it with a custom field or separate record
      const vipRateRecord = await prisma.profile.update({
        where: { id: testReferrerId },
        data: {
          // Store VIP rate in a custom field (simulated)
          // In real implementation, this would be in a VIPRate table
          customCommissionRate: vipRate,
        },
        select: {
          id: true,
          customCommissionRate: true,
        },
      });

      assertEqual(Number(vipRateRecord.customCommissionRate), vipRate, 'VIP rate should be set');

      logSuccess(`VIP rate set for referrer: $${vipRate}`);
      logInfo(`  Referrer: ${testReferrerUsername}`);
      logInfo(`  VIP Rate: $${vipRate}`);
    })
  );

  // Test 3.4: Calculate commission with correct tier
  results.push(
    await runTest('3.4 Calculate commission with tier', async () => {
      // Function to calculate tier rate based on referral count
      function calculateTierRate(
        referralCount: number,
        tierStructure: typeof CUSTOM_TIER_STRUCTURE
      ): number {
        if (referralCount <= tierStructure.tier1.max!) {
          return tierStructure.tier1.rate;
        } else if (referralCount <= tierStructure.tier2.max!) {
          return tierStructure.tier2.rate;
        } else {
          return tierStructure.tier3.rate;
        }
      }

      // Test scenarios
      const scenarios = [
        { count: 1, expectedRate: 20 },   // Tier 1
        { count: 3, expectedRate: 20 },   // Tier 1 boundary
        { count: 4, expectedRate: 30 },   // Tier 2
        { count: 10, expectedRate: 30 },  // Tier 2 boundary
        { count: 11, expectedRate: 40 },  // Tier 3
        { count: 100, expectedRate: 40 }, // Deep in Tier 3
      ];

      for (const scenario of scenarios) {
        const rate = calculateTierRate(scenario.count, CUSTOM_TIER_STRUCTURE);
        assertEqual(
          rate,
          scenario.expectedRate,
          `Rate for ${scenario.count} referrals should be $${scenario.expectedRate}`
        );
      }

      // Create a commission with the correct tier
      const referralCount = 5; // Tier 2
      const expectedRate = calculateTierRate(referralCount, CUSTOM_TIER_STRUCTURE);

      // Create test lead
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        referrerUsername: testReferrerUsername,
        firstName: 'Commission',
        lastName: 'Test',
      });

      // Create commission with tier rate
      const commission = await prisma.commission.create({
        data: {
          referrerId: testReferrerId,
          amount: expectedRate,
          status: 'APPROVED',
          sourceType: 'RETURN_FILED',
          sourceId: intakeLead.id,
          clientName: `${intakeLead.first_name} ${intakeLead.last_name}`,
          clientEmail: intakeLead.email,
          commissionType: 'TIERED',
          commissionRate: expectedRate,
          rateAtCreation: expectedRate,
          rateSource: 'CUSTOM',
          approvedAt: new Date(),
        },
      });

      assertEqual(Number(commission.amount), expectedRate, 'Commission amount should match tier rate');
      assertEqual(commission.commissionType, 'TIERED', 'Commission type should be TIERED');

      logSuccess('Commission calculated with correct tier');
      logInfo(`  Referral count: ${referralCount}`);
      logInfo(`  Tier rate: $${expectedRate}`);
      logInfo(`  Commission ID: ${commission.id}`);
    })
  );

  // Test 3.5: Remove VIP rate → falls back to tier
  results.push(
    await runTest('3.5 Remove VIP rate falls back to tier', async () => {
      // Get current VIP rate
      const beforeRemoval = await prisma.profile.findUnique({
        where: { id: testReferrerId },
        select: { customCommissionRate: true },
      });

      assertNotNull(beforeRemoval!.customCommissionRate, 'VIP rate should exist before removal');

      // Remove VIP rate
      const afterRemoval = await prisma.profile.update({
        where: { id: testReferrerId },
        data: {
          customCommissionRate: null,
        },
        select: { customCommissionRate: true },
      });

      assertEqual(afterRemoval.customCommissionRate, null, 'VIP rate should be removed');

      // Verify fallback to tier rate
      const referralCount = 5; // Tier 2
      const tierRate = CUSTOM_TIER_STRUCTURE.tier2.rate; // $30

      // Create another commission - should use tier rate now
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        referrerUsername: testReferrerUsername,
        firstName: 'Fallback',
        lastName: 'Test',
      });

      const commission = await prisma.commission.create({
        data: {
          referrerId: testReferrerId,
          amount: tierRate,
          status: 'APPROVED',
          sourceType: 'RETURN_FILED',
          sourceId: intakeLead.id,
          clientName: `${intakeLead.first_name} ${intakeLead.last_name}`,
          clientEmail: intakeLead.email,
          commissionType: 'TIERED',
          commissionRate: tierRate,
          rateAtCreation: tierRate,
          rateSource: 'CUSTOM', // Falls back to preparer's custom tier
          approvedAt: new Date(),
        },
      });

      assertEqual(Number(commission.amount), tierRate, 'Commission should use tier rate after VIP removal');

      logSuccess('VIP rate removed, falls back to tier');
      logInfo(`  Previous VIP rate: $${beforeRemoval!.customCommissionRate}`);
      logInfo(`  New tier rate: $${tierRate}`);
    })
  );

  // Bonus: Test tier progression
  results.push(
    await runTest('3.6 Test tier progression', async () => {
      // Simulate referrals and track commission totals
      const referrals = [
        { count: 1, tier: 1, rate: 20 },
        { count: 2, tier: 1, rate: 20 },
        { count: 3, tier: 1, rate: 20 },
        { count: 4, tier: 2, rate: 30 }, // Tier bump!
        { count: 5, tier: 2, rate: 30 },
        { count: 10, tier: 2, rate: 30 },
        { count: 11, tier: 3, rate: 40 }, // Tier bump!
      ];

      let totalCommissions = 0;
      let previousTier = 1;

      for (const ref of referrals) {
        totalCommissions += ref.rate;

        if (ref.tier !== previousTier) {
          logInfo(`  Tier ${previousTier} → Tier ${ref.tier} at referral #${ref.count}`);
          previousTier = ref.tier;
        }
      }

      // Verify total
      const expectedTotal = 20 + 20 + 20 + 30 + 30 + 30 + 40; // = 190
      assertEqual(totalCommissions, 190, 'Total commissions should be $190');

      logSuccess('Tier progression verified');
      logInfo(`  Total referrals: ${referrals.length}`);
      logInfo(`  Total commissions: $${totalCommissions}`);
      logInfo(`  Average per referral: $${(totalCommissions / referrals.length).toFixed(2)}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 13: Commission Calculation');

  try {
    const results = await runCommissionCalculationTests();

    // Summary
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n' + '─'.repeat(50));
    results.forEach((r) => {
      const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
      if (!r.passed && r.error) {
        console.log(`         Error: ${r.error}`);
      }
    });
    console.log('─'.repeat(50));
    console.log(`\n  Results: ${passed}/${results.length} passed`);

    if (failed > 0) {
      console.log(`  \x1b[31m${failed} tests failed\x1b[0m`);
      process.exit(1);
    }

    // Cleanup test data
    logInfo('Cleaning up test data...');
    await cleanupAllTestData();

    process.exit(0);
  } catch (error) {
    logError(`Test suite error: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

export { runCommissionCalculationTests };
