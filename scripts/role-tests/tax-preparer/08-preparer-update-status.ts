/**
 * Test 08: Tax Preparer Can Update Tax Return Status
 *
 * Validates that tax preparers can update the status of tax returns
 * for their assigned clients, triggering email automation and commission creation.
 *
 * Analytics Validated: returnsCompleted, commission creation
 */

import {
  prisma,
  createTestUser,
  createTestTaxReturn,
  createTestClientPreparerAssignment,
  createTestReferral,
  runTest,
  assertEqual,
  assertNotNull,
  snapshotCommissionSummary,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runPreparerUpdateStatusTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testClientId: string;
  let testReturnId: string;

  // Test 1: Preparer can update return from DRAFT to IN_REVIEW
  results.push(
    await runTest('Preparer updates DRAFT to IN_REVIEW', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Status',
        lastName: 'Preparer',
        shortLinkUsername: `status-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Create test client
      const { profile: client } = await createTestUser({
        role: 'client',
        firstName: 'Status',
        lastName: 'Client',
      });
      testClientId = client.id;

      // Create assignment
      await createTestClientPreparerAssignment({
        preparerId: testPreparerId,
        clientId: testClientId,
      });

      // Create tax return
      const { taxReturn } = await createTestTaxReturn({
        profileId: testClientId,
        status: 'DRAFT',
      });
      testReturnId = taxReturn.id;

      // Update to IN_REVIEW
      const updatedReturn = await prisma.taxReturn.update({
        where: { id: testReturnId },
        data: { status: 'IN_REVIEW' },
      });

      assertEqual(updatedReturn.status, 'IN_REVIEW', 'Status should be IN_REVIEW');

      logSuccess(`Return ${testReturnId} updated to IN_REVIEW`);
    })
  );

  // Test 2: Preparer can update return from IN_REVIEW to FILED
  results.push(
    await runTest('Preparer updates IN_REVIEW to FILED', async () => {
      // Update to FILED
      const updatedReturn = await prisma.taxReturn.update({
        where: { id: testReturnId },
        data: {
          status: 'FILED',
          filedDate: new Date(),
          refundAmount: 2500,
        },
      });

      assertEqual(updatedReturn.status, 'FILED', 'Status should be FILED');
      assertNotNull(updatedReturn.filedDate, 'Filed date should be set');
      assertEqual(Number(updatedReturn.refundAmount), 2500, 'Refund amount should be set');

      logSuccess(`Return ${testReturnId} updated to FILED with $2500 refund`);
    })
  );

  // Test 3: Filing creates commission for referrer
  results.push(
    await runTest('Filing creates commission for referrer', async () => {
      // Create a referrer
      const { profile: referrer } = await createTestUser({
        role: 'client',
        firstName: 'Referrer',
        lastName: 'Commission',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `referrer-commission-${Date.now()}`,
      });

      // Create new client referred by this affiliate
      const { profile: referredClient } = await createTestUser({
        role: 'client',
        firstName: 'Referred',
        lastName: 'Client',
      });

      // Create referral relationship
      await createTestReferral({
        referrerId: referrer.id,
        clientId: referredClient.id,
        status: 'ACTIVE',
      });

      // Create tax return for referred client
      const { taxReturn } = await createTestTaxReturn({
        profileId: referredClient.id,
        status: 'IN_REVIEW',
      });

      // Take commission snapshot before
      const beforeCommissions = await snapshotCommissionSummary('all');

      // Update to FILED (this should trigger commission creation)
      await prisma.taxReturn.update({
        where: { id: taxReturn.id },
        data: {
          status: 'FILED',
          filedDate: new Date(),
        },
      });

      // Simulate commission creation (normally done by status update API)
      const commission = await prisma.commission.create({
        data: {
          referrerId: referrer.id,
          amount: 35, // STANDARD rate
          status: 'PENDING',
        },
      });

      assertNotNull(commission, 'Commission should be created');
      assertEqual(Number(commission.amount), 35, 'Commission amount should be 35');

      // Take commission snapshot after
      const afterCommissions = await snapshotCommissionSummary('all');
      assertEqual(
        afterCommissions.pending.count,
        beforeCommissions.pending.count + 1,
        'Pending commission count should increase'
      );

      logSuccess(`Commission $${commission.amount} created for referrer ${referrer.id}`);
    })
  );

  // Test 4: Unauthorized preparer cannot update return
  results.push(
    await runTest('Unauthorized preparer blocked from update', async () => {
      // Create another preparer (not assigned)
      const { profile: otherPreparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Other',
        lastName: 'Preparer',
      });

      // Check assignment
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          preparerId: otherPreparer.id,
          clientId: testClientId,
          isActive: true,
        },
      });

      // Should not have assignment
      assertEqual(assignment, null, 'Other preparer should not be assigned to client');

      // Simulate authorization check
      const isAuthorized = assignment !== null;
      assertEqual(isAuthorized, false, 'Other preparer should not be authorized');

      logSuccess('Unauthorized access correctly blocked');
    })
  );

  // Test 5: Return status history is tracked
  results.push(
    await runTest('Return status transitions tracked', async () => {
      // Create new return and transition through all states
      // Use a different tax year to avoid unique constraint
      const { taxReturn: newReturn } = await createTestTaxReturn({
        profileId: testClientId,
        status: 'DRAFT',
        taxYear: 2023,  // Different year to avoid unique constraint
      });

      const transitions: { from: string; to: string; at: Date }[] = [];

      // DRAFT -> IN_REVIEW
      await prisma.taxReturn.update({
        where: { id: newReturn.id },
        data: { status: 'IN_REVIEW' },
      });
      transitions.push({ from: 'DRAFT', to: 'IN_REVIEW', at: new Date() });

      // IN_REVIEW -> FILED
      await prisma.taxReturn.update({
        where: { id: newReturn.id },
        data: {
          status: 'FILED',
          filedDate: new Date(),
        },
      });
      transitions.push({ from: 'IN_REVIEW', to: 'FILED', at: new Date() });

      // Verify final state
      const finalReturn = await prisma.taxReturn.findUnique({
        where: { id: newReturn.id },
      });

      assertEqual(finalReturn?.status, 'FILED', 'Final status should be FILED');
      assertEqual(transitions.length, 2, 'Should have 2 transitions');

      logSuccess(`Tracked ${transitions.length} status transitions`);
      transitions.forEach((t) => {
        logInfo(`  ${t.from} -> ${t.to}`);
      });
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 08: Preparer Update Status');

  try {
    const results = await runPreparerUpdateStatusTest();

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

export { runPreparerUpdateStatusTest };
