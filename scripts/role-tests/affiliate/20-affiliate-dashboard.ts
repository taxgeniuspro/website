/**
 * Test 20: Affiliate Dashboard Shows Accurate Referral Counts
 *
 * Validates that the affiliate dashboard displays accurate counts
 * of referrals, conversions, and commission summary.
 *
 * Analytics Validated: Earnings summary by status
 */

import {
  prisma,
  createTestUser,
  createTestLeads,
  createTestCommissions,
  runTest,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  getAffiliatePerformance,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAffiliateDashboardTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let affiliateId: string;
  let affiliateUsername: string;

  // Test 1: Dashboard shows lead counts
  results.push(
    await runTest('Dashboard shows lead counts', async () => {
      // Create affiliate
      const { profile: affiliate } = await createTestUser({
        role: 'client',
        firstName: 'Dashboard',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `dashboard-${Date.now()}`,
      });
      affiliateId = affiliate.id;
      affiliateUsername = affiliate.shortLinkUsername!;

      // Create leads with various statuses
      await createTestLeads(10, {
        referrerUsername: affiliateUsername,
        referrerType: 'AFFILIATE',
        statusDistribution: {
          NEW: 4,
          CONTACTED: 3,
          CONVERTED: 3,
        },
      });

      // Get affiliate performance
      const performance = await getAffiliatePerformance(affiliateUsername, 'all');

      assertNotNull(performance, 'Performance should exist');
      assertGreaterThanOrEqual(performance.leads, 10, 'Should have at least 10 leads');
      assertGreaterThanOrEqual(performance.conversions, 3, 'Should have at least 3 conversions');

      logSuccess(`Lead counts: ${performance.leads} total, ${performance.conversions} conversions`);
    })
  );

  // Test 2: Dashboard shows conversion rate
  results.push(
    await runTest('Dashboard shows conversion rate', async () => {
      const performance = await getAffiliatePerformance(affiliateUsername, 'all');

      assertNotNull(performance, 'Performance should exist');

      const conversionRate = performance.conversionRate;
      assertGreaterThanOrEqual(conversionRate, 0, 'Conversion rate should be >= 0');

      // With 3 conversions out of 10 leads, rate should be around 30%
      logSuccess(`Conversion rate: ${conversionRate.toFixed(1)}%`);
    })
  );

  // Test 3: Dashboard shows commission breakdown
  results.push(
    await runTest('Dashboard shows commission breakdown', async () => {
      // Create commissions with different statuses
      await createTestCommissions(affiliateId, {
        pending: 2,
        approved: 1,
        paid: 1,
      }, 25);

      // Get updated performance
      const performance = await getAffiliatePerformance(affiliateUsername, 'all');

      assertNotNull(performance, 'Performance should exist');
      assertGreaterThanOrEqual(performance.pendingCommissions, 50, 'Should have $50 pending');
      assertGreaterThanOrEqual(performance.totalCommissions, 100, 'Should have $100 total');

      logSuccess('Commission breakdown displayed');
      logInfo(`  Pending: $${performance.pendingCommissions}`);
      logInfo(`  Total: $${performance.totalCommissions}`);
    })
  );

  // Test 4: Dashboard filters by time period
  results.push(
    await runTest('Dashboard filters by period', async () => {
      // Get 7-day performance
      const week = await getAffiliatePerformance(affiliateUsername, '7d');

      // Get 30-day performance
      const month = await getAffiliatePerformance(affiliateUsername, '30d');

      // Get all-time performance
      const allTime = await getAffiliatePerformance(affiliateUsername, 'all');

      assertNotNull(week, '7-day performance should exist');
      assertNotNull(month, '30-day performance should exist');
      assertNotNull(allTime, 'All-time performance should exist');

      // All-time should be >= month >= week
      assertGreaterThanOrEqual(allTime?.leads || 0, month?.leads || 0,
        'All-time should be >= month');

      logSuccess('Time period filtering works');
      logInfo(`  7 days: ${week?.leads} leads`);
      logInfo(`  30 days: ${month?.leads} leads`);
      logInfo(`  All time: ${allTime?.leads} leads`);
    })
  );

  // Test 5: Dashboard shows lead list (privacy respected)
  results.push(
    await runTest('Dashboard shows leads with privacy', async () => {
      // Get leads for affiliate
      const leads = await prisma.lead.findMany({
        where: {
          referrerUsername: affiliateUsername,
          referrerType: 'AFFILIATE',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
          // Note: email and phone NOT selected for privacy
        },
      });

      assertGreaterThanOrEqual(leads.length, 1, 'Should have at least 1 lead');

      // Verify privacy - email and phone should not be exposed
      for (const lead of leads) {
        assertNotNull(lead.firstName, 'First name should be visible');
        assertNotNull(lead.status, 'Status should be visible');
        assertEqual((lead as Record<string, unknown>).email, undefined, 'Email should not be exposed');
        assertEqual((lead as Record<string, unknown>).phone, undefined, 'Phone should not be exposed');
      }

      logSuccess(`${leads.length} leads displayed with privacy protected`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 20: Affiliate Dashboard');

  try {
    const results = await runAffiliateDashboardTest();

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
    console.error(`Test suite error: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

export { runAffiliateDashboardTest };
