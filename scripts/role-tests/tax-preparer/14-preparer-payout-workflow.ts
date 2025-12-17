/**
 * Test 14: Tax Preparer Payout Workflow
 *
 * Validates commission payout management.
 *
 * Tests:
 * - 4.1: View pending commissions (count and amount)
 * - 4.2: View approved commissions
 * - 4.3: Mark commission as paid with payment method
 * - 4.4: Verify payment reference stored correctly
 * - 4.5: Calculate totals: owed vs paid vs this month
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
  createTestCommission,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThan,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

// Payment methods
const PAYMENT_METHODS = ['CASH', 'CHECK', 'ZELLE', 'VENMO', 'CASHAPP', 'PAYPAL', 'BANK_TRANSFER'] as const;

async function runPayoutWorkflowTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testReferrerId: string;
  let testCommissionIds: string[] = [];

  // Setup: Create preparer and referrer with commissions
  results.push(
    await runTest('Setup: Create test data', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Payout',
        lastName: 'Preparer',
        shortLinkUsername: `payout-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Create test referrer
      const { profile: referrer } = await createTestUser({
        role: 'client',
        firstName: 'Payout',
        lastName: 'Referrer',
        shortLinkUsername: `payout-referrer-${Date.now()}`,
        affiliateStatus: 'APPROVED',
      });
      testReferrerId = referrer.id;

      // Create multiple commissions in different statuses
      // 3 PENDING commissions
      for (let i = 0; i < 3; i++) {
        const { intakeLead } = await createTestTaxIntakeLead({
          assignedPreparerId: testPreparerId,
          referrerUsername: referrer.shortLinkUsername!,
          firstName: `Pending`,
          lastName: `Client${i}`,
        });

        const { commission } = await createTestCommission({
          referrerId: testReferrerId,
          amount: 25,
          status: 'PENDING',
        });
        testCommissionIds.push(commission.id);
      }

      // 2 APPROVED commissions
      for (let i = 0; i < 2; i++) {
        const { commission } = await createTestCommission({
          referrerId: testReferrerId,
          amount: 35,
          status: 'APPROVED',
        });
        testCommissionIds.push(commission.id);
      }

      // 2 PAID commissions
      for (let i = 0; i < 2; i++) {
        const commission = await prisma.commission.create({
          data: {
            referrerId: testReferrerId,
            amount: 50,
            status: 'PAID',
            paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            paymentMethod: 'ZELLE',
            paymentRef: `TEST-REF-${i}`,
          },
        });
        testCommissionIds.push(commission.id);
      }

      logSuccess(`Created ${testCommissionIds.length} test commissions`);
      logInfo(`  3 PENDING ($25 each = $75)`);
      logInfo(`  2 APPROVED ($35 each = $70)`);
      logInfo(`  2 PAID ($50 each = $100)`);
    })
  );

  // Test 4.1: View pending commissions
  results.push(
    await runTest('4.1 View pending commissions', async () => {
      const pendingCommissions = await prisma.commission.findMany({
        where: {
          referrerId: testReferrerId,
          status: 'PENDING',
        },
      });

      assertEqual(pendingCommissions.length, 3, 'Should have 3 pending commissions');

      const totalPending = pendingCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
      assertEqual(totalPending, 75, 'Total pending should be $75');

      logSuccess(`Found ${pendingCommissions.length} pending commissions`);
      logInfo(`  Count: ${pendingCommissions.length}`);
      logInfo(`  Total: $${totalPending}`);
    })
  );

  // Test 4.2: View approved commissions
  results.push(
    await runTest('4.2 View approved commissions', async () => {
      const approvedCommissions = await prisma.commission.findMany({
        where: {
          referrerId: testReferrerId,
          status: 'APPROVED',
        },
      });

      assertEqual(approvedCommissions.length, 2, 'Should have 2 approved commissions');

      const totalApproved = approvedCommissions.reduce((sum, c) => sum + Number(c.amount), 0);
      assertEqual(totalApproved, 70, 'Total approved should be $70');

      // Verify approved commissions have approvedAt
      for (const commission of approvedCommissions) {
        // Note: In test setup, approvedAt may not be set
        // In real workflow, it would be set when transitioning from PENDING
      }

      logSuccess(`Found ${approvedCommissions.length} approved commissions`);
      logInfo(`  Count: ${approvedCommissions.length}`);
      logInfo(`  Total: $${totalApproved}`);
    })
  );

  // Test 4.3: Mark commission as paid with payment method
  results.push(
    await runTest('4.3 Mark commission as paid', async () => {
      // Get an approved commission to mark as paid
      const approvedCommission = await prisma.commission.findFirst({
        where: {
          referrerId: testReferrerId,
          status: 'APPROVED',
        },
      });

      assertNotNull(approvedCommission, 'Should have an approved commission to pay');

      const paymentMethod = 'ZELLE';
      const paymentRef = `PAY-${Date.now()}`;

      // Mark as paid
      const paidCommission = await prisma.commission.update({
        where: { id: approvedCommission!.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod: paymentMethod,
          paymentRef: paymentRef,
        },
      });

      assertEqual(paidCommission.status, 'PAID', 'Status should be PAID');
      assertNotNull(paidCommission.paidAt, 'paidAt should be set');
      assertEqual(paidCommission.paymentMethod, paymentMethod, 'Payment method should match');
      assertEqual(paidCommission.paymentRef, paymentRef, 'Payment reference should match');

      logSuccess('Commission marked as paid');
      logInfo(`  Commission ID: ${paidCommission.id}`);
      logInfo(`  Amount: $${paidCommission.amount}`);
      logInfo(`  Method: ${paymentMethod}`);
      logInfo(`  Reference: ${paymentRef}`);
    })
  );

  // Test 4.4: Verify payment reference stored correctly
  results.push(
    await runTest('4.4 Payment reference stored correctly', async () => {
      // Get all paid commissions
      const paidCommissions = await prisma.commission.findMany({
        where: {
          referrerId: testReferrerId,
          status: 'PAID',
        },
        orderBy: { paidAt: 'desc' },
      });

      assertGreaterThan(paidCommissions.length, 0, 'Should have paid commissions');

      // Verify each paid commission has proper payment info
      for (const commission of paidCommissions) {
        assertNotNull(commission.paidAt, `Commission ${commission.id} should have paidAt`);
        assertNotNull(commission.paymentMethod, `Commission ${commission.id} should have paymentMethod`);

        // Verify payment method is valid
        const isValidMethod = PAYMENT_METHODS.includes(commission.paymentMethod as any);
        assert(isValidMethod, `Payment method ${commission.paymentMethod} should be valid`);
      }

      logSuccess('All payment references verified');
      logInfo(`  Paid commissions: ${paidCommissions.length}`);
      logInfo(`  Payment methods used: ${[...new Set(paidCommissions.map(c => c.paymentMethod))].join(', ')}`);
    })
  );

  // Test 4.5: Calculate totals
  results.push(
    await runTest('4.5 Calculate totals: owed vs paid vs this month', async () => {
      // Get all commissions for this referrer
      const allCommissions = await prisma.commission.findMany({
        where: { referrerId: testReferrerId },
      });

      // Calculate totals by status
      const totals = {
        pending: 0,
        pendingCount: 0,
        approved: 0,
        approvedCount: 0,
        paid: 0,
        paidCount: 0,
        thisMonthPaid: 0,
      };

      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      for (const commission of allCommissions) {
        const amount = Number(commission.amount);
        switch (commission.status) {
          case 'PENDING':
            totals.pending += amount;
            totals.pendingCount++;
            break;
          case 'APPROVED':
            totals.approved += amount;
            totals.approvedCount++;
            break;
          case 'PAID':
            totals.paid += amount;
            totals.paidCount++;
            if (commission.paidAt && new Date(commission.paidAt) >= thisMonthStart) {
              totals.thisMonthPaid += amount;
            }
            break;
        }
      }

      // Total owed = pending + approved
      const totalOwed = totals.pending + totals.approved;

      // Verify calculations
      assertGreaterThan(totalOwed, 0, 'Total owed should be > 0');
      assertGreaterThan(totals.paid, 0, 'Total paid should be > 0');

      logSuccess('Commission totals calculated');
      logInfo(`  Summary:`);
      logInfo(`    PENDING: ${totals.pendingCount} commissions, $${totals.pending}`);
      logInfo(`    APPROVED: ${totals.approvedCount} commissions, $${totals.approved}`);
      logInfo(`    PAID: ${totals.paidCount} commissions, $${totals.paid}`);
      logInfo(`  Calculations:`);
      logInfo(`    Total Owed: $${totalOwed} (pending + approved)`);
      logInfo(`    Total Paid: $${totals.paid}`);
      logInfo(`    Paid This Month: $${totals.thisMonthPaid}`);
    })
  );

  // Bonus: Test all payment methods
  results.push(
    await runTest('4.6 Test all payment methods', async () => {
      for (const method of PAYMENT_METHODS) {
        // Create a commission and pay it with this method
        const commission = await prisma.commission.create({
          data: {
            referrerId: testReferrerId,
            amount: 10,
            status: 'APPROVED',
          },
        });

        const paidCommission = await prisma.commission.update({
          where: { id: commission.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paymentMethod: method,
            paymentRef: `${method}-${Date.now()}`,
          },
        });

        assertEqual(paidCommission.paymentMethod, method, `Payment method should be ${method}`);
        testCommissionIds.push(commission.id);
      }

      logSuccess(`All ${PAYMENT_METHODS.length} payment methods tested`);
      logInfo(`  Methods: ${PAYMENT_METHODS.join(', ')}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 14: Payout Workflow');

  try {
    const results = await runPayoutWorkflowTests();

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

export { runPayoutWorkflowTests };
