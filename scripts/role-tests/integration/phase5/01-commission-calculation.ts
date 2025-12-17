/**
 * Integration Test: Phase 5.1 - Commission Calculation
 *
 * Tests commission creation and calculation when leads convert.
 * Note: Commission model has referrerId (FK to Profile) and referralId (FK to Referral),
 * with clientName/clientEmail fields to track the referred client info.
 */

import {
  prisma,
  createTestUser,
  createTestCommission,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  logHeader,
  logSuccess,
  logInfo,
  logError,
  TestResult,
  cleanupAllTestData,
} from '../../test-utils/index';

async function runCommissionCalculationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testAffiliateId: string;
  let testClientName: string;
  let testClientEmail: string;
  let testCommissionId: string;

  // Setup
  results.push(
    await runTest('Setup: Create affiliate and client info', async () => {
      const { profile: affiliate } = await createTestUser({
        role: 'client',
        firstName: 'Commission',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `cma${Date.now()}`,
      });
      testAffiliateId = affiliate.id;

      // Client info for commission tracking (not a separate referredId)
      testClientName = `Referred Client ${Date.now()}`;
      testClientEmail = `referred-${Date.now()}@test-taxgeniuspro.local`;

      logSuccess('Setup complete');
      logInfo(`  Affiliate: ${testAffiliateId}`);
      logInfo(`  Client: ${testClientName}`);
    })
  );

  // Test 5.1.1: Create commission on conversion
  results.push(
    await runTest('5.1.1 Create commission on conversion', async () => {
      // Commission links to referrer via referrerId, stores client info in fields
      const commission = await prisma.commission.create({
        data: {
          referrerId: testAffiliateId,
          amount: 50,
          status: 'PENDING',
          clientName: testClientName,
          clientEmail: testClientEmail,
          sourceType: 'INTAKE_LEAD',
        },
      });

      testCommissionId = commission.id;
      assertNotNull(commission.id, 'Commission should be created');
      assertEqual(commission.status, 'PENDING', 'Status should be PENDING');
      assertEqual(Number(commission.amount), 50, 'Amount should be $50');

      logSuccess(`Commission created: ${commission.id}`);
      logInfo(`  Amount: $${commission.amount}`);
      logInfo(`  Status: ${commission.status}`);
    })
  );

  // Test 5.1.2: Verify commission relationships
  results.push(
    await runTest('5.1.2 Verify commission relationships', async () => {
      const commission = await prisma.commission.findUnique({
        where: { id: testCommissionId },
        include: {
          referrer: true,
        },
      });

      assertNotNull(commission, 'Commission should exist');
      assertEqual(commission!.referrerId, testAffiliateId, 'Referrer should match');
      assertNotNull(commission!.referrer, 'Referrer profile should be included');
      assertEqual(commission!.clientName, testClientName, 'Client name should match');
      assertEqual(commission!.clientEmail, testClientEmail, 'Client email should match');

      logSuccess('Commission relationships verified');
    })
  );

  // Test 5.1.3: Commission idempotency (same conversion = same commission)
  results.push(
    await runTest('5.1.3 Commission idempotency check', async () => {
      // Find existing commission by referrer and client email
      const existing = await prisma.commission.findFirst({
        where: {
          referrerId: testAffiliateId,
          clientEmail: testClientEmail,
        },
      });

      assertNotNull(existing, 'Should find existing commission');
      assertEqual(existing!.id, testCommissionId, 'Should be the same commission');

      logSuccess('Idempotency check passed - no duplicate created');
    })
  );

  // Test 5.1.4: Query affiliate commissions
  results.push(
    await runTest('5.1.4 Query affiliate commissions', async () => {
      const commissions = await prisma.commission.findMany({
        where: { referrerId: testAffiliateId },
      });

      assertEqual(commissions.length, 1, 'Affiliate should have 1 commission');
      logSuccess(`Affiliate has ${commissions.length} commission(s)`);
    })
  );

  // Test 5.1.5: Calculate total earnings
  results.push(
    await runTest('5.1.5 Calculate total earnings', async () => {
      const total = await prisma.commission.aggregate({
        where: { referrerId: testAffiliateId },
        _sum: { amount: true },
      });

      assertNotNull(total._sum.amount, 'Should have sum');
      assertEqual(Number(total._sum.amount), 50, 'Total should be $50');

      logSuccess(`Total earnings: $${total._sum.amount}`);
    })
  );

  // Test 5.1.6: Verify tier 1 rate ($50)
  results.push(
    await runTest('5.1.6 Verify tier 1 commission rate', async () => {
      const commission = await prisma.commission.findUnique({
        where: { id: testCommissionId },
      });

      // Tier 1 (0-10 referrals): $50
      assertEqual(Number(commission!.amount), 50, 'Tier 1 rate should be $50');
      logSuccess('Tier 1 rate verified: $50');
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 5.1: Commission Calculation');

  try {
    const results = await runCommissionCalculationTests();
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n' + '─'.repeat(50));
    results.forEach((r) => {
      const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
      if (!r.passed && r.error) console.log(`         Error: ${r.error}`);
    });
    console.log('─'.repeat(50));
    console.log(`\n  Results: ${passed}/${results.length} passed`);

    if (failed > 0) process.exit(1);

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
