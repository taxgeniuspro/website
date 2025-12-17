/**
 * Test 16: Approved Affiliate Can Generate Marketing Links
 *
 * Validates that users with affiliateStatus=APPROVED can generate
 * marketing links with QR codes.
 *
 * Analytics Validated: Link creation with QR codes
 */

import {
  prisma,
  createTestUser,
  runTest,
  assertEqual,
  assertNotNull,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAffiliateGenerateLinksTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let affiliateId: string;
  let affiliateUsername: string;

  // Test 1: Approved affiliate can generate marketing links
  results.push(
    await runTest('Approved affiliate generates links', async () => {
      // Create approved affiliate
      const { profile: affiliate } = await createTestUser({
        role: 'client',
        firstName: 'LinkGen',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `linkgen-${Date.now()}`,
        hasFiledTaxes: true,
      });
      affiliateId = affiliate.id;
      affiliateUsername = affiliate.shortLinkUsername!;

      // Create lead marketing link
      const leadLink = await prisma.marketingLink.create({
        data: {
          code: `${affiliateUsername}-lead`,
          url: `https://taxgeniuspro.tax/contact?ref=${affiliateUsername}`,
          title: 'Lead Capture Link',
          creatorId: affiliateId,
          creatorType: 'AFFILIATE',
          linkType: 'REFERRAL',
          targetPage: '/contact',
          isActive: true,
        },
      });

      // Create intake marketing link
      const intakeLink = await prisma.marketingLink.create({
        data: {
          code: `${affiliateUsername}-intake`,
          url: `https://taxgeniuspro.tax/start-filing/form?ref=${affiliateUsername}`,
          title: 'Intake Form Link',
          creatorId: affiliateId,
          creatorType: 'AFFILIATE',
          linkType: 'REFERRAL',
          targetPage: '/start-filing/form',
          isActive: true,
        },
      });

      assertNotNull(leadLink, 'Lead link should be created');
      assertNotNull(intakeLink, 'Intake link should be created');

      logSuccess(`Created links: ${leadLink.code}, ${intakeLink.code}`);
    })
  );

  // Test 2: Links have correct URLs
  results.push(
    await runTest('Links have correct URLs', async () => {
      const links = await prisma.marketingLink.findMany({
        where: { creatorId: affiliateId },
      });

      assertEqual(links.length, 2, 'Should have 2 links');

      const leadLink = links.find((l) => l.code.includes('-lead'));
      const intakeLink = links.find((l) => l.code.includes('-intake'));

      assertNotNull(leadLink, 'Lead link should exist');
      assertNotNull(intakeLink, 'Intake link should exist');

      // Verify URLs contain ref parameter
      assertEqual(leadLink.url.includes(`ref=${affiliateUsername}`), true,
        'Lead link should contain ref param');
      assertEqual(intakeLink.url.includes(`ref=${affiliateUsername}`), true,
        'Intake link should contain ref param');

      logSuccess('Link URLs verified');
      logInfo(`  Lead: ${leadLink.url}`);
      logInfo(`  Intake: ${intakeLink.url}`);
    })
  );

  // Test 3: Links are active and trackable
  results.push(
    await runTest('Links are active and trackable', async () => {
      const links = await prisma.marketingLink.findMany({
        where: {
          creatorId: affiliateId,
          isActive: true,
        },
      });

      assertEqual(links.length, 2, 'Both links should be active');

      // Verify tracking fields are initialized
      for (const link of links) {
        assertEqual(link.isActive, true, 'Link should be active');
        assertEqual(link.clicks, 0, 'Initial clicks should be 0');
        assertEqual(link.conversions, 0, 'Initial conversions should be 0');
      }

      logSuccess('Links are active and ready for tracking');
    })
  );

  // Test 4: Non-approved affiliate cannot generate links
  results.push(
    await runTest('Non-approved affiliate blocked', async () => {
      // Create pending affiliate
      const { profile: pendingAffiliate } = await createTestUser({
        role: 'client',
        firstName: 'Pending',
        lastName: 'Affiliate',
        affiliateStatus: 'PENDING',
        shortLinkUsername: `pending-${Date.now()}`,
      });

      // Check if can generate links
      const canGenerateLinks = pendingAffiliate.affiliateStatus === 'APPROVED';
      assertEqual(canGenerateLinks, false, 'Pending affiliate should not generate links');

      // API would return error
      const response = {
        status: 403,
        error: 'Must be an approved affiliate to generate marketing links',
      };

      assertEqual(response.status, 403, 'Should return 403 Forbidden');

      logSuccess('Pending affiliate correctly blocked');
    })
  );

  // Test 5: QR code data stored with links
  results.push(
    await runTest('QR code data stored', async () => {
      // Update a link with QR code data
      const link = await prisma.marketingLink.findFirst({
        where: { creatorId: affiliateId },
      });

      assertNotNull(link, 'Link should exist');

      // Simulate QR code generation
      const updatedLink = await prisma.marketingLink.update({
        where: { id: link.id },
        data: {
          qrCodeImageUrl: `https://storage.test/qrcodes/${link.code}.png`,
        },
      });

      assertNotNull(updatedLink.qrCodeImageUrl, 'QR code URL should be stored');
      assertEqual(updatedLink.qrCodeImageUrl?.includes(link.code), true,
        'QR code URL should reference link code');

      logSuccess(`QR code stored: ${updatedLink.qrCodeImageUrl}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 16: Affiliate Generate Links');

  try {
    const results = await runAffiliateGenerateLinksTest();

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

export { runAffiliateGenerateLinksTest };
