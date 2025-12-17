/**
 * Integration Test: Phase 5.2 - Commission Approval Flow
 *
 * Tests admin commission approval and payout processing.
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

async function runCommissionApprovalTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testAdminId: string;
  let testAffiliateId: string;
  let testCommissionId: string;

  // Setup
  results.push(
    await runTest('Setup: Create admin, affiliate, and pending commission', async () => {
      const { profile: admin } = await createTestUser({
        role: 'admin',
        firstName: 'Approval',
        lastName: 'Admin',
      });
      testAdminId = admin.id;

      const { profile: affiliate } = await createTestUser({
        role: 'client',
        firstName: 'Payout',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `poa${Date.now()}`,
      });
      testAffiliateId = affiliate.id;

      const { commission } = await createTestCommission({
        referrerId: testAffiliateId,
        amount: 75,
        status: 'PENDING',
      });
      testCommissionId = commission.id;

      logSuccess('Setup complete');
      logInfo(`  Admin: ${testAdminId}`);
      logInfo(`  Affiliate: ${testAffiliateId}`);
      logInfo(`  Commission: ${testCommissionId}`);
    })
  );

  // Test 5.2.1: Verify commission is PENDING
  results.push(
    await runTest('5.2.1 Commission starts as PENDING', async () => {
      const commission = await prisma.commission.findUnique({
        where: { id: testCommissionId },
      });

      assertEqual(commission!.status, 'PENDING', 'Status should be PENDING');
      assertEqual(commission!.approvedBy, null, 'Should not have approver yet');
      assertEqual(commission!.approvedAt, null, 'Should not have approval date yet');

      logSuccess('Commission is PENDING');
    })
  );

  // Test 5.2.2: Admin approves commission
  results.push(
    await runTest('5.2.2 Admin approves commission', async () => {
      const commission = await prisma.commission.update({
        where: { id: testCommissionId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: testAdminId,
        },
      });

      assertEqual(commission.status, 'APPROVED', 'Status should be APPROVED');
      assertNotNull(commission.approvedAt, 'Should have approval date');
      assertEqual(commission.approvedBy, testAdminId, 'Should have approver');

      logSuccess('Commission approved');
      logInfo(`  Approved at: ${commission.approvedAt}`);
      logInfo(`  Approved by: ${commission.approvedBy}`);
    })
  );

  // Test 5.2.3: Calculate pending earnings
  results.push(
    await runTest('5.2.3 Calculate approved earnings', async () => {
      const approved = await prisma.commission.aggregate({
        where: {
          referrerId: testAffiliateId,
          status: 'APPROVED',
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      assertEqual(approved._count.id, 1, 'Should have 1 approved commission');
      assertEqual(Number(approved._sum.amount), 75, 'Approved amount should be $75');

      logSuccess(`Approved earnings: $${approved._sum.amount}`);
    })
  );

  // Test 5.2.4: Process payout
  results.push(
    await runTest('5.2.4 Process payout', async () => {
      const paymentRef = `PAY-TEST-${Date.now()}`;

      const commission = await prisma.commission.update({
        where: { id: testCommissionId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentRef,
        },
      });

      assertEqual(commission.status, 'PAID', 'Status should be PAID');
      assertNotNull(commission.paidAt, 'Should have payment date');
      assertEqual(commission.paymentRef, paymentRef, 'Should have payment reference');

      logSuccess('Payout processed');
      logInfo(`  Payment Ref: ${paymentRef}`);
    })
  );

  // Test 5.2.5: Verify paid commission not in pending
  results.push(
    await runTest('5.2.5 Paid commission excluded from pending', async () => {
      const pending = await prisma.commission.aggregate({
        where: {
          referrerId: testAffiliateId,
          status: 'PENDING',
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      assertEqual(pending._count.id, 0, 'Should have 0 pending commissions');
      logSuccess('No pending commissions');
    })
  );

  // Test 5.2.6: Query paid commissions
  results.push(
    await runTest('5.2.6 Query paid commissions', async () => {
      const paid = await prisma.commission.findMany({
        where: {
          referrerId: testAffiliateId,
          status: 'PAID',
        },
      });

      assertEqual(paid.length, 1, 'Should have 1 paid commission');
      assertNotNull(paid[0].paymentRef, 'Should have payment reference');

      logSuccess(`Paid commissions: ${paid.length}`);
      logInfo(`  Total paid: $${paid.reduce((sum, c) => sum + Number(c.amount), 0)}`);
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 5.2: Commission Approval Flow');

  try {
    const results = await runCommissionApprovalTests();
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
export { runCommissionApprovalTests };
