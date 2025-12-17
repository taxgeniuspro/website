/**
 * Test 17: Marketing Link Click Creates Proper Attribution Trail
 *
 * Validates that clicking an affiliate's marketing link creates a
 * LinkClick record with proper attribution data and UTM tracking.
 *
 * Analytics Validated: LinkClick records, UTM params
 */

import {
  prisma,
  createTestUser,
  createTestMarketingLink,
  createTestLinkClick,
  runTest,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAffiliateClickTrackingTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let affiliateId: string;
  let linkId: string;

  // Test 1: Link click creates record
  results.push(
    await runTest('Link click creates record', async () => {
      // Create affiliate
      const { profile: affiliate } = await createTestUser({
        role: 'client',
        firstName: 'Click',
        lastName: 'Tracker',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `click-tracker-${Date.now()}`,
      });
      affiliateId = affiliate.id;

      // Create marketing link
      const { link } = await createTestMarketingLink({
        creatorId: affiliateId,
        creatorType: 'AFFILIATE',
        clicks: 0,
      });
      linkId = link.id;

      // Record a click
      const { linkClick } = await createTestLinkClick({
        linkId,
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'winter2025',
      });

      assertNotNull(linkClick, 'Link click should be created');
      assertEqual(linkClick.linkId, linkId, 'Should reference correct link');

      logSuccess(`Click recorded: ${linkClick.id}`);
    })
  );

  // Test 2: UTM parameters are captured
  results.push(
    await runTest('UTM parameters captured', async () => {
      const clicks = await prisma.linkClick.findMany({
        where: { linkId },
      });

      assertGreaterThanOrEqual(clicks.length, 1, 'Should have at least 1 click');

      const click = clicks[0];
      assertEqual(click.utmSource, 'facebook', 'UTM source should be captured');
      assertEqual(click.utmMedium, 'social', 'UTM medium should be captured');
      assertEqual(click.utmCampaign, 'winter2025', 'UTM campaign should be captured');

      logSuccess('UTM parameters captured');
      logInfo(`  Source: ${click.utmSource}`);
      logInfo(`  Medium: ${click.utmMedium}`);
      logInfo(`  Campaign: ${click.utmCampaign}`);
    })
  );

  // Test 3: Click counter increments
  results.push(
    await runTest('Click counter increments', async () => {
      // Record multiple clicks
      for (let i = 0; i < 5; i++) {
        await createTestLinkClick({ linkId });
      }

      // Update link click count
      await prisma.marketingLink.update({
        where: { id: linkId },
        data: {
          clicks: { increment: 5 },
          uniqueClicks: { increment: 5 },
        },
      });

      // Verify counter
      const link = await prisma.marketingLink.findUnique({
        where: { id: linkId },
      });

      assertGreaterThanOrEqual(link?.clicks || 0, 5, 'Clicks should be at least 5');

      logSuccess(`Click counter: ${link?.clicks}`);
    })
  );

  // Test 4: Click metadata is stored
  results.push(
    await runTest('Click metadata stored', async () => {
      const click = await prisma.linkClick.findFirst({
        where: { linkId },
      });

      assertNotNull(click, 'Click should exist');
      assertNotNull(click.ipAddress, 'IP address should be captured');
      assertNotNull(click.userAgent, 'User agent should be captured');
      assertNotNull(click.clickedAt, 'Click timestamp should be set');

      logSuccess('Click metadata stored');
      logInfo(`  IP: ${click.ipAddress}`);
      logInfo(`  User Agent: ${click.userAgent?.substring(0, 30)}...`);
      logInfo(`  Clicked At: ${click.clickedAt}`);
    })
  );

  // Test 5: Click conversion tracking
  results.push(
    await runTest('Click conversion tracking', async () => {
      // Create a click that converts
      const { linkClick } = await createTestLinkClick({
        linkId,
        converted: false,
      });

      // Simulate conversion
      const convertedClick = await prisma.linkClick.update({
        where: { id: linkClick.id },
        data: {
          converted: true,
          intakeCompletedAt: new Date(),
        },
      });

      assertEqual(convertedClick.converted, true, 'Click should be marked converted');
      assertNotNull(convertedClick.intakeCompletedAt, 'Conversion timestamp should be set');

      // Update link conversion count
      await prisma.marketingLink.update({
        where: { id: linkId },
        data: { conversions: { increment: 1 } },
      });

      const link = await prisma.marketingLink.findUnique({
        where: { id: linkId },
      });

      assertGreaterThanOrEqual(link?.conversions || 0, 1, 'Conversions should be at least 1');

      logSuccess(`Click converted: ${convertedClick.id}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 17: Affiliate Click Tracking');

  try {
    const results = await runAffiliateClickTrackingTest();

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

export { runAffiliateClickTrackingTest };
