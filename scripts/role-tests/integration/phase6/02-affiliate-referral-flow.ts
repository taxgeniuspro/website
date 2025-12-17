/**
 * Integration Test: Phase 6.2 - Affiliate Referral Flow
 *
 * Tests the complete affiliate referral process from link click to commission.
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
  logHeader,
  logSuccess,
  logInfo,
  logError,
  TestResult,
  cleanupAllTestData,
} from '../../test-utils/index';

async function runAffiliateReferralFlowTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testAffiliateId: string;
  let testTrackingCode: string;
  let testLinkId: string;
  let testLeadId: string;
  let testClientId: string;

  // Setup: Create affiliate with marketing link
  results.push(
    await runTest('Setup: Create affiliate with marketing link', async () => {
      const { profile } = await createTestUser({
        role: 'client',
        firstName: 'Referral',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `ra${Date.now()}`,
      });
      testAffiliateId = profile.id;
      testTrackingCode = profile.shortLinkUsername || `ra${Date.now()}`;

      const link = await prisma.marketingLink.create({
        data: {
          code: `${testTrackingCode}-intake`,
          url: `https://taxgeniuspro.tax/start-filing/form?ref=${testTrackingCode}`,
          shortUrl: `https://taxgeniuspro.tax/go/${testTrackingCode}-intake`,
          title: 'Tax Intake',
          creatorId: testAffiliateId,
          creatorType: 'AFFILIATE',
          linkType: 'REFERRAL',
          targetPage: '/start-filing/form',
          isActive: true,
        },
      });
      testLinkId = link.id;

      logSuccess('Affiliate created with marketing link');
      logInfo(`  Affiliate: ${testAffiliateId}`);
      logInfo(`  Tracking: ${testTrackingCode}`);
      logInfo(`  Link: ${link.shortUrl}`);
    })
  );

  // Test 6.2.1: Record link click
  results.push(
    await runTest('6.2.1 Record link click', async () => {
      const click = await prisma.linkClick.create({
        data: {
          linkId: testLinkId,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Agent',
          referrer: 'https://facebook.com',
          utmSource: 'facebook',
          utmMedium: 'social',
          utmCampaign: 'tax2024',
        },
      });

      assertNotNull(click.id, 'Click should be recorded');
      assertEqual(click.linkId, testLinkId, 'Link should match');

      // Update link click count
      await prisma.marketingLink.update({
        where: { id: testLinkId },
        data: { clicks: { increment: 1 } },
      });

      logSuccess(`Link click recorded: ${click.id}`);
      logInfo(`  UTM Source: ${click.utmSource}`);
    })
  );

  // Test 6.2.2: Lead created with affiliate attribution
  results.push(
    await runTest('6.2.2 Lead created with affiliate attribution', async () => {
      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'Referred',
        lastName: `Customer${Date.now()}`,
        referrerUsername: testTrackingCode,
        // Note: Affiliate referrals are NOT auto-assigned to the affiliate
        // They go to corporate or get assigned by admin
      });
      testLeadId = intakeLead.id;

      assertEqual(intakeLead.referrerUsername, testTrackingCode, 'Lead should be attributed to affiliate');
      assertEqual(intakeLead.assignedPreparerId, null, 'Lead should NOT be auto-assigned to affiliate');

      logSuccess('Lead created with affiliate attribution');
      logInfo(`  Lead: ${testLeadId}`);
      logInfo(`  Attributed to: ${testTrackingCode}`);
    })
  );

  // Test 6.2.3: Lead converts to client
  results.push(
    await runTest('6.2.3 Lead converts to client', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      // Create client
      const user = await prisma.user.create({
        data: {
          email: lead!.email,
          name: `${lead!.first_name} ${lead!.last_name}`,
          emailVerified: new Date(),
        },
      });

      const client = await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'client',
          firstName: lead!.first_name,
          lastName: lead!.last_name || '',
          phone: lead!.phone,
          affiliateStatus: 'APPROVED',
        },
      });
      testClientId = client.id;

      // Mark lead as converted (using boolean flags, not status enum)
      await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: client.id,
        },
      });

      logSuccess('Lead converted to client');
      logInfo(`  Client: ${testClientId}`);
    })
  );

  // Test 6.2.4: Commission created for affiliate
  results.push(
    await runTest('6.2.4 Commission created for affiliate', async () => {
      // Get client info for commission
      const client = await prisma.profile.findUnique({
        where: { id: testClientId },
        include: { user: true },
      });

      // Create commission with clientName/clientEmail (not referredId)
      const commission = await prisma.commission.create({
        data: {
          referrerId: testAffiliateId,
          amount: 50,
          status: 'PENDING',
          sourceType: 'INTAKE_LEAD',
          sourceId: testLeadId,
          clientName: `${client!.firstName} ${client!.lastName}`,
          clientEmail: client!.user?.email || '',
        },
      });

      assertNotNull(commission.id, 'Commission should be created');
      assertEqual(commission.referrerId, testAffiliateId, 'Referrer should be affiliate');
      assertEqual(commission.status, 'PENDING', 'Status should be PENDING');

      logSuccess('Commission created for affiliate');
      logInfo(`  Amount: $${commission.amount}`);
      logInfo(`  Status: ${commission.status}`);
    })
  );

  // Test 6.2.5: Verify affiliate's earnings updated
  results.push(
    await runTest('6.2.5 Verify affiliate earnings', async () => {
      const earnings = await prisma.commission.aggregate({
        where: { referrerId: testAffiliateId },
        _sum: { amount: true },
        _count: { id: true },
      });

      assertEqual(earnings._count.id, 1, 'Should have 1 commission');
      assertEqual(Number(earnings._sum.amount), 50, 'Should have $50 earnings');

      logSuccess('Affiliate earnings verified');
      logInfo(`  Total: $${earnings._sum.amount}`);
      logInfo(`  Referrals: ${earnings._count.id}`);
    })
  );

  // Test 6.2.6: Verify link stats updated
  results.push(
    await runTest('6.2.6 Verify link statistics', async () => {
      const link = await prisma.marketingLink.findUnique({
        where: { id: testLinkId },
        include: {
          _count: { select: { linkClicks: true } },
        },
      });

      assertNotNull(link, 'Link should exist');
      assertEqual(link!.clicks, 1, 'Link should have 1 click recorded in clicks field');

      logSuccess('Link statistics verified');
      logInfo(`  Clicks (counter): ${link!.clicks}`);
      logInfo(`  Click records: ${link!._count.linkClicks}`);
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 6.2: Affiliate Referral Flow');

  try {
    const results = await runAffiliateReferralFlowTests();
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
export { runAffiliateReferralFlowTests };
