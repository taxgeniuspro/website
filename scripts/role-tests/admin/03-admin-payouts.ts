/**
 * Test 03: Admin Can View and Approve Commission Payouts
 *
 * Validates that administrators can view pending payout requests
 * and approve them, correctly updating commission statuses.
 *
 * Analytics Validated: getCommissionSummary()
 */

import {
  prisma,
  createTestUser,
  createTestCommissions,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  getFirstUserByRole,
  snapshotCommissionSummary,
  compareCommissions,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAdminPayoutsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Setup: Create test affiliate with commissions
  let testReferrerId: string;

  // Test 1: Admin can view pending commissions
  results.push(
    await runTest('Admin can view pending commissions', async () => {
      const adminSession = await getFirstUserByRole('admin');
      assertNotNull(adminSession, 'Admin user should exist');

      // Create test affiliate with pending commissions
      const { profile: referrer } = await createTestUser({
        role: 'client',
        firstName: 'TestReferrer',
        lastName: 'Payout',
        affiliateStatus: 'APPROVED',
      });
      testReferrerId = referrer.id;

      // Create commissions: 3 pending, 1 approved, 1 paid
      await createTestCommissions(referrer.id, {
        pending: 3,
        approved: 1,
        paid: 1,
      }, 50);

      // Query pending commissions
      const pendingCommissions = await prisma.commission.findMany({
        where: {
          referrerId: referrer.id,
          status: 'PENDING',
        },
        include: {
          referrer: {
            include: { user: true },
          },
        },
      });

      assertEqual(pendingCommissions.length, 3, 'Should have 3 pending commissions');

      // Verify each commission has required fields
      for (const commission of pendingCommissions) {
        assertNotNull(commission.amount, 'Commission should have amount');
        assertEqual(commission.status, 'PENDING', 'Status should be PENDING');
        assertNotNull(commission.referrer, 'Commission should have referrer');
        assertNotNull(commission.referrer.user.email, 'Referrer should have email');
      }

      logSuccess(`Found ${pendingCommissions.length} pending commissions totaling $${pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0)}`);
    })
  );

  // Test 2: Commission summary shows correct totals
  results.push(
    await runTest('Commission summary shows correct totals', async () => {
      const summary = await snapshotCommissionSummary('all');

      assertGreaterThanOrEqual(summary.pending.count, 3, 'Should have at least 3 pending commissions');
      assertGreaterThanOrEqual(summary.approved.count, 1, 'Should have at least 1 approved commission');
      assertGreaterThanOrEqual(summary.paid.count, 1, 'Should have at least 1 paid commission');

      // Verify totals add up
      const sumOfCounts = summary.pending.count + summary.approved.count + summary.paid.count;
      assertEqual(sumOfCounts, summary.total.count, 'Counts should add up to total');

      logSuccess(`Commission summary: ${summary.total.count} total ($${summary.total.amount})`);
      logInfo(`  Pending: ${summary.pending.count} ($${summary.pending.amount})`);
      logInfo(`  Approved: ${summary.approved.count} ($${summary.approved.amount})`);
      logInfo(`  Paid: ${summary.paid.count} ($${summary.paid.amount})`);
    })
  );

  // Test 3: Admin can approve a pending commission
  results.push(
    await runTest('Admin can approve a pending commission', async () => {
      // Get a pending commission
      const pendingCommission = await prisma.commission.findFirst({
        where: {
          referrerId: testReferrerId,
          status: 'PENDING',
        },
      });

      assertNotNull(pendingCommission, 'Should have a pending commission');

      // Take snapshot before
      const beforeSummary = await snapshotCommissionSummary('all');

      // Approve the commission
      const approvedCommission = await prisma.commission.update({
        where: { id: pendingCommission.id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      assertEqual(approvedCommission.status, 'APPROVED', 'Commission should be APPROVED');
      assertNotNull(approvedCommission.approvedAt, 'ApprovedAt should be set');

      // Take snapshot after
      const afterSummary = await snapshotCommissionSummary('all');
      const changes = compareCommissions(beforeSummary, afterSummary);

      // Verify analytics updated
      assertEqual(changes.pendingChange.count, -1, 'Pending count should decrease by 1');
      assertEqual(changes.approvedChange.count, 1, 'Approved count should increase by 1');

      logSuccess(`Commission ${pendingCommission.id} approved`);
      logInfo(`  Pending: ${beforeSummary.pending.count} -> ${afterSummary.pending.count}`);
      logInfo(`  Approved: ${beforeSummary.approved.count} -> ${afterSummary.approved.count}`);
    })
  );

  // Test 4: Admin can process approved commission to paid
  results.push(
    await runTest('Admin can mark commission as paid', async () => {
      // Get an approved commission
      const approvedCommission = await prisma.commission.findFirst({
        where: {
          referrerId: testReferrerId,
          status: 'APPROVED',
        },
      });

      assertNotNull(approvedCommission, 'Should have an approved commission');

      // Take snapshot before
      const beforeSummary = await snapshotCommissionSummary('all');

      // Mark as paid
      const paidCommission = await prisma.commission.update({
        where: { id: approvedCommission.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentRef: `TEST-PAY-${Date.now()}`,
        },
      });

      assertEqual(paidCommission.status, 'PAID', 'Commission should be PAID');
      assertNotNull(paidCommission.paidAt, 'PaidAt should be set');
      assertNotNull(paidCommission.paymentRef, 'Payment reference should be set');

      // Take snapshot after
      const afterSummary = await snapshotCommissionSummary('all');
      const changes = compareCommissions(beforeSummary, afterSummary);

      // Verify analytics updated
      assertEqual(changes.approvedChange.count, -1, 'Approved count should decrease by 1');
      assertEqual(changes.paidChange.count, 1, 'Paid count should increase by 1');

      logSuccess(`Commission ${approvedCommission.id} marked as paid`);
    })
  );

  // Test 5: Batch approve multiple commissions
  results.push(
    await runTest('Admin can batch approve commissions', async () => {
      // Get remaining pending commissions for test referrer
      const pendingCommissions = await prisma.commission.findMany({
        where: {
          referrerId: testReferrerId,
          status: 'PENDING',
        },
      });

      if (pendingCommissions.length === 0) {
        // Create more pending commissions
        await createTestCommissions(testReferrerId, { pending: 2 }, 25);
      }

      const commissionsToApprove = await prisma.commission.findMany({
        where: {
          referrerId: testReferrerId,
          status: 'PENDING',
        },
        take: 2,
      });

      assertGreaterThanOrEqual(commissionsToApprove.length, 1, 'Should have commissions to approve');

      // Take snapshot before
      const beforeSummary = await snapshotCommissionSummary('all');

      // Batch approve
      const result = await prisma.commission.updateMany({
        where: {
          id: { in: commissionsToApprove.map((c) => c.id) },
          status: 'PENDING',
        },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
        },
      });

      // Take snapshot after
      const afterSummary = await snapshotCommissionSummary('all');
      const changes = compareCommissions(beforeSummary, afterSummary);

      // Verify batch update
      assertEqual(result.count, commissionsToApprove.length, 'Should approve all selected commissions');
      assertEqual(changes.pendingChange.count, -commissionsToApprove.length, 'Pending count should decrease');
      assertEqual(changes.approvedChange.count, commissionsToApprove.length, 'Approved count should increase');

      logSuccess(`Batch approved ${result.count} commissions`);
      logInfo(`  Pending: ${beforeSummary.pending.count} -> ${afterSummary.pending.count}`);
      logInfo(`  Approved: ${beforeSummary.approved.count} -> ${afterSummary.approved.count}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 03: Admin Payouts');

  try {
    const results = await runAdminPayoutsTest();

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

export { runAdminPayoutsTest };
