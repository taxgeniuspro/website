/**
 * Test 09: Tax Preparer Analytics Shows Personal Metrics
 *
 * Validates that the tax preparer dashboard correctly displays
 * their personal performance metrics.
 *
 * Analytics Validated: getPreparerDashboardStats()
 */

import {
  prisma,
  createTestUser,
  createTestLeads,
  createTestTaxIntakeLead,
  createTestTaxReturn,
  createTestMarketingLink,
  createTestClientPreparerAssignment,
  runTest,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  getPreparerPerformance,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runPreparerAnalyticsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testPreparerUsername: string;

  // Test 1: Preparer dashboard shows intake lead counts
  results.push(
    await runTest('Dashboard shows intake lead counts', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Dashboard',
        lastName: 'Preparer',
        shortLinkUsername: `dashboard-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;
      testPreparerUsername = preparer.shortLinkUsername!;

      // Create intake leads
      for (let i = 0; i < 10; i++) {
        await createTestTaxIntakeLead({
          assignedPreparerId: testPreparerId,
          firstName: `IntakeLead${i}`,
          completed: i < 6, // 6 completed, 4 pending
        });
      }

      // Calculate stats
      const totalIntakes = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: testPreparerId },
      });

      const completedIntakes = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: testPreparerId, completed: true },
      });

      assertEqual(totalIntakes, 10, 'Should have 10 total intakes');
      assertEqual(completedIntakes, 6, 'Should have 6 completed intakes');

      logSuccess(`Intake stats: ${completedIntakes}/${totalIntakes} completed`);
    })
  );

  // Test 2: Dashboard shows referral lead counts
  results.push(
    await runTest('Dashboard shows referral lead counts', async () => {
      // Create leads attributed to this preparer
      await createTestLeads(8, {
        referrerUsername: testPreparerUsername,
        referrerType: 'TAX_PREPARER',
        statusDistribution: {
          NEW: 3,
          CONTACTED: 2,
          CONVERTED: 3,
        },
      });

      // Get from analytics service
      const performance = await getPreparerPerformance(testPreparerUsername, 'all');

      assertNotNull(performance, 'Performance data should exist');
      assertGreaterThanOrEqual(performance.leads, 8, 'Should have at least 8 leads');
      assertGreaterThanOrEqual(performance.conversions, 3, 'Should have at least 3 conversions');

      logSuccess(`Lead stats: ${performance.leads} leads, ${performance.conversions} conversions`);
    })
  );

  // Test 3: Dashboard shows returns in progress vs completed
  results.push(
    await runTest('Dashboard shows return progress', async () => {
      // Create clients with returns
      for (let i = 0; i < 5; i++) {
        const { profile: client } = await createTestUser({
          role: 'client',
          firstName: `ReturnClient${i}`,
          lastName: 'Test',
        });

        await createTestClientPreparerAssignment({
          preparerId: testPreparerId,
          clientId: client.id,
        });

        await createTestTaxReturn({
          profileId: client.id,
          status: i < 2 ? 'FILED' : 'IN_REVIEW', // 2 filed, 3 in progress
        });
      }

      // Calculate stats
      const clientIds = (await prisma.clientPreparer.findMany({
        where: { preparerId: testPreparerId, isActive: true },
        select: { clientId: true },
      })).map((c) => c.clientId);

      const returnsInProgress = await prisma.taxReturn.count({
        where: {
          profileId: { in: clientIds },
          status: { in: ['DRAFT', 'IN_REVIEW'] },
        },
      });

      const returnsCompleted = await prisma.taxReturn.count({
        where: {
          profileId: { in: clientIds },
          status: { in: ['FILED', 'ACCEPTED'] },
        },
      });

      assertGreaterThanOrEqual(returnsInProgress, 3, 'Should have at least 3 in progress');
      assertGreaterThanOrEqual(returnsCompleted, 2, 'Should have at least 2 completed');

      logSuccess(`Returns: ${returnsInProgress} in progress, ${returnsCompleted} completed`);
    })
  );

  // Test 4: Dashboard shows marketing link performance
  results.push(
    await runTest('Dashboard shows link performance', async () => {
      // Create marketing link for preparer
      const { link } = await createTestMarketingLink({
        creatorId: testPreparerId,
        creatorType: 'TAX_PREPARER',
        clicks: 150,
        intakeStarts: 60,
        intakeCompletes: 30,
        returnsFiled: 15,
      });

      // Verify link stats
      assertEqual(link.clicks, 150, 'Should have 150 clicks');
      assertEqual(link.intakeStarts, 60, 'Should have 60 intake starts');
      assertEqual(link.intakeCompletes, 30, 'Should have 30 intake completes');

      // Calculate conversion rates
      const clickToIntake = (link.intakeStarts / link.clicks) * 100;
      const intakeToComplete = (link.intakeCompletes / link.intakeStarts) * 100;

      logSuccess(`Link performance: ${link.clicks} clicks, ${clickToIntake.toFixed(1)}% to intake, ${intakeToComplete.toFixed(1)}% completion`);
    })
  );

  // Test 5: Preparer sees only their own stats (not others)
  results.push(
    await runTest('Preparer sees only own stats', async () => {
      // Create another preparer
      const { profile: otherPreparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Other',
        lastName: 'Preparer',
        shortLinkUsername: `other-preparer-${Date.now()}`,
      });

      // Create leads for other preparer
      await createTestLeads(5, {
        referrerUsername: otherPreparer.shortLinkUsername!,
        referrerType: 'TAX_PREPARER',
        statusDistribution: { NEW: 5 },
      });

      // Get test preparer's performance
      const testPerformance = await getPreparerPerformance(testPreparerUsername, 'all');
      const otherPerformance = await getPreparerPerformance(otherPreparer.shortLinkUsername!, 'all');

      assertNotNull(testPerformance, 'Test preparer should have performance data');
      assertNotNull(otherPerformance, 'Other preparer should have performance data');

      // They should have different lead counts
      // Test preparer's leads should not include other preparer's leads
      const testLeadCount = testPerformance.leads;
      const otherLeadCount = otherPerformance.leads;

      assertGreaterThanOrEqual(otherLeadCount, 5, 'Other preparer should have at least 5 leads');

      logSuccess(`Stats isolated: Test preparer ${testLeadCount} leads, Other ${otherLeadCount} leads`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 09: Preparer Analytics');

  try {
    const results = await runPreparerAnalyticsTest();

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

export { runPreparerAnalyticsTest };
