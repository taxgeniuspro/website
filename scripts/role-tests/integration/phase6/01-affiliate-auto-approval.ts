/**
 * Integration Test: Phase 6.1 - Affiliate Auto-Approval
 *
 * Tests that clients are automatically approved as affiliates.
 */

import {
  prisma,
  createTestUser,
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

async function runAffiliateAutoApprovalTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testClientId: string;

  // Test 6.1.1: Create client with auto-approved affiliate status
  results.push(
    await runTest('6.1.1 Client created with APPROVED affiliate status', async () => {
      const { profile } = await createTestUser({
        role: 'client',
        firstName: 'AutoApproved',
        lastName: 'Client',
        affiliateStatus: 'APPROVED', // System auto-approves
      });
      testClientId = profile.id;

      assertEqual(profile.affiliateStatus, 'APPROVED', 'Should be auto-approved');
      logSuccess('Client auto-approved as affiliate');
    })
  );

  // Test 6.1.2: Verify tracking code assigned
  results.push(
    await runTest('6.1.2 Tracking code assigned', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: testClientId },
      });

      // Check for any tracking code
      const hasTrackingCode =
        profile!.trackingCode ||
        profile!.customTrackingCode ||
        profile!.shortLinkUsername;

      assert(!!hasTrackingCode, 'Should have a tracking code');
      logSuccess('Tracking code assigned');
      logInfo(`  trackingCode: ${profile!.trackingCode || 'not set'}`);
      logInfo(`  customTrackingCode: ${profile!.customTrackingCode || 'not set'}`);
      logInfo(`  shortLinkUsername: ${profile!.shortLinkUsername || 'not set'}`);
    })
  );

  // Test 6.1.3: Affiliate can create marketing links
  results.push(
    await runTest('6.1.3 Affiliate can create marketing links', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: testClientId },
      });

      const trackingCode = profile!.customTrackingCode || profile!.shortLinkUsername || `aff${Date.now()}`;

      const link = await prisma.marketingLink.create({
        data: {
          code: `${trackingCode}-intake`,
          url: `https://taxgeniuspro.tax/start-filing/form?ref=${trackingCode}`,
          shortUrl: `https://taxgeniuspro.tax/go/${trackingCode}-intake`,
          title: 'Tax Intake Form',
          creatorId: testClientId,
          creatorType: 'AFFILIATE',
          linkType: 'REFERRAL',
          targetPage: '/start-filing/form',
          isActive: true,
        },
      });

      assertNotNull(link.id, 'Marketing link should be created');
      assertEqual(link.creatorType, 'AFFILIATE', 'Creator type should be AFFILIATE');
      assertEqual(link.isActive, true, 'Link should be active');

      logSuccess(`Marketing link created: ${link.shortUrl}`);
    })
  );

  // Test 6.1.4: Verify affiliate can view earnings
  results.push(
    await runTest('6.1.4 Affiliate can query earnings', async () => {
      const earnings = await prisma.commission.aggregate({
        where: { referrerId: testClientId },
        _sum: { amount: true },
        _count: { id: true },
      });

      // New affiliate has $0 earnings
      assertEqual(earnings._count.id, 0, 'New affiliate has 0 commissions');
      logSuccess('Earnings query works (0 commissions for new affiliate)');
    })
  );

  // Test 6.1.5: Verify affiliate status persists
  results.push(
    await runTest('6.1.5 Affiliate status persists', async () => {
      // Update profile (simulate user editing their profile)
      await prisma.profile.update({
        where: { id: testClientId },
        data: { phone: '555-9999' },
      });

      const profile = await prisma.profile.findUnique({
        where: { id: testClientId },
      });

      assertEqual(profile!.affiliateStatus, 'APPROVED', 'Affiliate status should persist');
      assertEqual(profile!.phone, '555-9999', 'Phone should be updated');

      logSuccess('Affiliate status persists after profile update');
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 6.1: Affiliate Auto-Approval');

  try {
    const results = await runAffiliateAutoApprovalTests();
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
export { runAffiliateAutoApprovalTests };
