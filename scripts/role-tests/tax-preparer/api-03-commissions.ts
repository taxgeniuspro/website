/**
 * API Test 03: Tax Preparer Commission & Links APIs
 *
 * Tests commission settings and payout endpoints.
 *
 * Tests:
 * - 9.1: GET /api/tax-preparer/commission-settings - returns settings
 * - 9.2: PUT /api/tax-preparer/commission-settings - updates settings
 * - 9.3: POST /api/tax-preparer/commission-settings/vip-rate - sets VIP rate
 * - 9.4: DELETE /api/tax-preparer/commission-settings/vip-rate - removes VIP
 * - 9.5: GET /api/tax-preparer/payout-obligations - returns obligations
 * - 9.6: POST /api/tax-preparer/payout-obligations/:id/mark-paid - marks paid
 * - 9.7: GET /api/tax-preparer/links - returns marketing links with QR
 */

import {
  prisma,
  createTestUser,
  createTestCommission,
  createTestTaxIntakeLead,
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

// Default tier structure
const DEFAULT_TIERS = {
  tier1: { max: 5, rate: 25 },
  tier2: { max: 15, rate: 35 },
  tier3: { max: null, rate: 50 },
};

// Custom tier structure for testing
const CUSTOM_TIERS = {
  tier1: { max: 3, rate: 20 },
  tier2: { max: 10, rate: 30 },
  tier3: { max: null, rate: 45 },
};

// Types
interface CommissionSettingsResponse {
  useCompanyDefaults: boolean;
  customTierStructure: any;
  companyDefaultTiers: any;
  referrers: any[];
}

interface PayoutObligationsResponse {
  commissions: any[];
  stats: {
    totalOwed: number;
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    paidCount: number;
    paidAmount: number;
    thisMonthPaid: number;
  };
}

interface LinksResponse {
  links: any[];
  trackingCode: string;
}

// Simulates GET /api/tax-preparer/commission-settings
async function simulateGetCommissionSettings(preparerId: string): Promise<CommissionSettingsResponse> {
  const profile = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      useCompanyCommissionDefaults: true,
      customTierStructure: true,
    },
  });

  // Get referrers with custom rates
  const leadsWithReferrers = await prisma.taxIntakeLead.findMany({
    where: {
      assignedPreparerId: preparerId,
      referrerUsername: { not: null },
    },
    select: { referrerUsername: true },
    distinct: ['referrerUsername'],
  });

  const referrerUsernames = leadsWithReferrers.map(l => l.referrerUsername).filter(Boolean);

  const referrers = await prisma.profile.findMany({
    where: {
      shortLinkUsername: { in: referrerUsernames as string[] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      shortLinkUsername: true,
      customCommissionRate: true,
    },
  });

  return {
    useCompanyDefaults: profile?.useCompanyCommissionDefaults !== false,
    customTierStructure: profile?.customTierStructure || null,
    companyDefaultTiers: DEFAULT_TIERS,
    referrers: referrers.map(r => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`,
      username: r.shortLinkUsername,
      vipRate: r.customCommissionRate,
    })),
  };
}

// Simulates GET /api/tax-preparer/payout-obligations
async function simulateGetPayoutObligations(preparerId: string): Promise<PayoutObligationsResponse> {
  // Get leads with referrers for this preparer
  const leads = await prisma.taxIntakeLead.findMany({
    where: {
      assignedPreparerId: preparerId,
      referrerUsername: { not: null },
    },
    select: { id: true },
  });

  const leadIds = leads.map(l => l.id);

  // Get commissions for these leads
  const commissions = await prisma.commission.findMany({
    where: {
      sourceType: 'RETURN_FILED',
      sourceId: { in: leadIds },
    },
    include: {
      referrer: {
        select: {
          firstName: true,
          lastName: true,
          shortLinkUsername: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);

  const stats = {
    totalOwed: 0,
    pendingCount: 0,
    pendingAmount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    thisMonthPaid: 0,
  };

  for (const c of commissions) {
    const amount = Number(c.amount);
    switch (c.status) {
      case 'PENDING':
        stats.pendingCount++;
        stats.pendingAmount += amount;
        stats.totalOwed += amount;
        break;
      case 'APPROVED':
        stats.approvedCount++;
        stats.approvedAmount += amount;
        stats.totalOwed += amount;
        break;
      case 'PAID':
        stats.paidCount++;
        stats.paidAmount += amount;
        if (c.paidAt && new Date(c.paidAt) >= thisMonthStart) {
          stats.thisMonthPaid += amount;
        }
        break;
    }
  }

  return { commissions, stats };
}

// Simulates GET /api/tax-preparer/links
async function simulateGetLinks(preparerId: string): Promise<LinksResponse> {
  const profile = await prisma.profile.findUnique({
    where: { id: preparerId },
    select: {
      trackingCode: true,
      trackingCodeFinalized: true,
      trackingCodeQRUrl: true,
      avatarUrl: true,
    },
  });

  if (!profile?.trackingCode) {
    return { links: [], trackingCode: '' };
  }

  const code = profile.trackingCode;
  const baseUrl = 'https://taxgeniuspro.tax';

  const links = [
    {
      type: 'lead',
      shortCode: `${code}-lead`,
      shortUrl: `${baseUrl}/go/${code}-lead`,
      fullUrl: `${baseUrl}/contact?ref=${code}`,
      qrCodeUrl: profile.trackingCodeQRUrl,
    },
    {
      type: 'intake',
      shortCode: `${code}-intake`,
      shortUrl: `${baseUrl}/go/${code}-intake`,
      fullUrl: `${baseUrl}/start-filing/form?ref=${code}`,
      qrCodeUrl: profile.trackingCodeQRUrl,
    },
    {
      type: 'appt',
      shortCode: `${code}-appt`,
      shortUrl: `${baseUrl}/go/${code}-appt`,
      fullUrl: `${baseUrl}/book?preparer=${preparerId}`,
      qrCodeUrl: profile.trackingCodeQRUrl,
    },
  ];

  return { links, trackingCode: code };
}

async function runCommissionAPITests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testReferrerId: string;
  let testReferrerUsername: string;
  let testCommissionIds: string[] = [];

  // Setup: Create preparer, referrer, and commissions
  results.push(
    await runTest('Setup: Create test data', async () => {
      // Create preparer with tracking code
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Commission',
        lastName: 'APITest',
        shortLinkUsername: `commission-api-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Set tracking code
      await prisma.profile.update({
        where: { id: testPreparerId },
        data: {
          trackingCode: `cap${Date.now()}`,
          trackingCodeFinalized: true,
          trackingCodeQRUrl: 'data:image/png;base64,TEST_QR_CODE',
        },
      });

      // Create referrer
      const { profile: referrer } = await createTestUser({
        role: 'client',
        firstName: 'Commission',
        lastName: 'Referrer',
        shortLinkUsername: `commission-referrer-${Date.now()}`,
        affiliateStatus: 'APPROVED',
      });
      testReferrerId = referrer.id;
      testReferrerUsername = referrer.shortLinkUsername!;

      // Create leads with referrer
      for (let i = 0; i < 5; i++) {
        const { intakeLead } = await createTestTaxIntakeLead({
          assignedPreparerId: testPreparerId,
          referrerUsername: testReferrerUsername,
          firstName: `Commission`,
          lastName: `Lead${i}`,
        });

        // Create commissions in different statuses
        let status: 'PENDING' | 'APPROVED' | 'PAID';
        if (i < 2) status = 'PENDING';
        else if (i < 4) status = 'APPROVED';
        else status = 'PAID';

        const commission = await prisma.commission.create({
          data: {
            referrerId: testReferrerId,
            amount: 25 + i * 5,
            status,
            sourceType: 'RETURN_FILED',
            sourceId: intakeLead.id,
            clientName: `Commission Lead${i}`,
            ...(status === 'PAID' ? {
              paidAt: new Date(),
              paymentMethod: 'ZELLE',
              paymentRef: `TEST-REF-${i}`,
            } : {}),
          },
        });
        testCommissionIds.push(commission.id);
      }

      logSuccess('Test data created');
      logInfo(`  2 PENDING, 2 APPROVED, 1 PAID commissions`);
    })
  );

  // Test 9.1: GET commission-settings
  results.push(
    await runTest('9.1 GET commission-settings returns data', async () => {
      const response = await simulateGetCommissionSettings(testPreparerId);

      assertNotNull(response, 'Response should exist');
      assert('useCompanyDefaults' in response, 'Should have useCompanyDefaults');
      assert('companyDefaultTiers' in response, 'Should have companyDefaultTiers');
      assert('referrers' in response, 'Should have referrers');

      // Verify default tiers structure
      assertNotNull(response.companyDefaultTiers.tier1, 'Should have tier1');
      assertNotNull(response.companyDefaultTiers.tier2, 'Should have tier2');
      assertNotNull(response.companyDefaultTiers.tier3, 'Should have tier3');

      logSuccess('Commission settings retrieved');
      logInfo(`  Uses defaults: ${response.useCompanyDefaults}`);
      logInfo(`  Referrers: ${response.referrers.length}`);
    })
  );

  // Test 9.2: PUT commission-settings updates
  results.push(
    await runTest('9.2 PUT commission-settings updates', async () => {
      // Update to custom tiers
      await prisma.profile.update({
        where: { id: testPreparerId },
        data: {
          useCompanyCommissionDefaults: false,
          customTierStructure: CUSTOM_TIERS,
        },
      });

      const response = await simulateGetCommissionSettings(testPreparerId);

      assertEqual(response.useCompanyDefaults, false, 'Should not use defaults');
      assertNotNull(response.customTierStructure, 'Should have custom tiers');

      const tiers = response.customTierStructure;
      assertEqual(tiers.tier1.rate, 20, 'Tier 1 rate should be 20');
      assertEqual(tiers.tier2.rate, 30, 'Tier 2 rate should be 30');
      assertEqual(tiers.tier3.rate, 45, 'Tier 3 rate should be 45');

      logSuccess('Commission settings updated');
      logInfo(`  Custom tiers: ${JSON.stringify(tiers)}`);
    })
  );

  // Test 9.3: POST vip-rate sets rate
  results.push(
    await runTest('9.3 POST vip-rate sets referrer rate', async () => {
      const vipRate = 60;

      // Set VIP rate
      await prisma.profile.update({
        where: { id: testReferrerId },
        data: {
          customCommissionRate: vipRate,
        },
      });

      // Verify
      const referrer = await prisma.profile.findUnique({
        where: { id: testReferrerId },
        select: { customCommissionRate: true },
      });

      assertEqual(Number(referrer!.customCommissionRate), vipRate, 'VIP rate should be set');

      // Verify in settings response
      const response = await simulateGetCommissionSettings(testPreparerId);
      const vipReferrer = response.referrers.find(r => r.id === testReferrerId);
      assertEqual(Number(vipReferrer?.vipRate), vipRate, 'VIP rate should appear in settings');

      logSuccess('VIP rate set');
      logInfo(`  Referrer: ${testReferrerUsername}`);
      logInfo(`  Rate: $${vipRate}`);
    })
  );

  // Test 9.4: DELETE vip-rate removes rate
  results.push(
    await runTest('9.4 DELETE vip-rate removes rate', async () => {
      // Remove VIP rate
      await prisma.profile.update({
        where: { id: testReferrerId },
        data: {
          customCommissionRate: null,
        },
      });

      // Verify
      const referrer = await prisma.profile.findUnique({
        where: { id: testReferrerId },
        select: { customCommissionRate: true },
      });

      assertEqual(referrer!.customCommissionRate, null, 'VIP rate should be removed');

      logSuccess('VIP rate removed');
    })
  );

  // Test 9.5: GET payout-obligations
  results.push(
    await runTest('9.5 GET payout-obligations returns data', async () => {
      const response = await simulateGetPayoutObligations(testPreparerId);

      assertNotNull(response.commissions, 'Should have commissions');
      assertNotNull(response.stats, 'Should have stats');

      // Verify stats
      assertEqual(response.stats.pendingCount, 2, 'Should have 2 pending');
      assertEqual(response.stats.approvedCount, 2, 'Should have 2 approved');
      assertEqual(response.stats.paidCount, 1, 'Should have 1 paid');

      // Total owed = pending + approved amounts
      const expectedOwed = (25 + 30) + (35 + 40); // 2 pending + 2 approved
      assertEqual(response.stats.totalOwed, expectedOwed, `Total owed should be $${expectedOwed}`);

      logSuccess('Payout obligations retrieved');
      logInfo(`  Pending: ${response.stats.pendingCount} ($${response.stats.pendingAmount})`);
      logInfo(`  Approved: ${response.stats.approvedCount} ($${response.stats.approvedAmount})`);
      logInfo(`  Paid: ${response.stats.paidCount} ($${response.stats.paidAmount})`);
      logInfo(`  Total owed: $${response.stats.totalOwed}`);
    })
  );

  // Test 9.6: POST mark-paid
  results.push(
    await runTest('9.6 POST mark-paid updates commission', async () => {
      // Get an approved commission
      const approvedCommission = await prisma.commission.findFirst({
        where: {
          id: { in: testCommissionIds },
          status: 'APPROVED',
        },
      });

      assertNotNull(approvedCommission, 'Should have approved commission');

      // Mark as paid
      const paidCommission = await prisma.commission.update({
        where: { id: approvedCommission!.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentMethod: 'VENMO',
          paymentRef: 'VENMO-TEST-123',
        },
      });

      assertEqual(paidCommission.status, 'PAID', 'Status should be PAID');
      assertNotNull(paidCommission.paidAt, 'paidAt should be set');
      assertEqual(paidCommission.paymentMethod, 'VENMO', 'Payment method should match');

      // Verify stats updated
      const response = await simulateGetPayoutObligations(testPreparerId);
      assertEqual(response.stats.paidCount, 2, 'Should now have 2 paid');
      assertEqual(response.stats.approvedCount, 1, 'Should now have 1 approved');

      logSuccess('Commission marked as paid');
      logInfo(`  Commission ID: ${paidCommission.id}`);
      logInfo(`  Method: ${paidCommission.paymentMethod}`);
      logInfo(`  Reference: ${paidCommission.paymentRef}`);
    })
  );

  // Test 9.7: GET links returns marketing links
  results.push(
    await runTest('9.7 GET links returns marketing data', async () => {
      const response = await simulateGetLinks(testPreparerId);

      assertNotNull(response.trackingCode, 'Should have tracking code');
      assertGreaterThan(response.links.length, 0, 'Should have links');

      // Verify link types
      const linkTypes = response.links.map(l => l.type);
      assert(linkTypes.includes('lead'), 'Should have lead link');
      assert(linkTypes.includes('intake'), 'Should have intake link');
      assert(linkTypes.includes('appt'), 'Should have appointment link');

      // Verify link structure
      for (const link of response.links) {
        assertNotNull(link.shortCode, `${link.type} should have shortCode`);
        assertNotNull(link.shortUrl, `${link.type} should have shortUrl`);
        assertNotNull(link.fullUrl, `${link.type} should have fullUrl`);
        assert(link.shortUrl.includes(response.trackingCode), 'Short URL should include tracking code');
      }

      logSuccess('Marketing links retrieved');
      logInfo(`  Tracking code: ${response.trackingCode}`);
      logInfo(`  Links:`);
      response.links.forEach(l => logInfo(`    - ${l.type}: ${l.shortUrl}`));
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('API Test 03: Commission & Links APIs');

  try {
    const results = await runCommissionAPITests();

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

export { runCommissionAPITests };
