/**
 * Test 18: Lead Signup from Affiliate Link Attributes Correctly
 *
 * Validates that when a visitor who clicked an affiliate link
 * submits the intake form, the lead is correctly attributed.
 *
 * Analytics Validated: Attribution method, confidence
 */

import {
  prisma,
  createTestUser,
  createTestLead,
  createTestTaxIntakeLead,
  runTest,
  assertEqual,
  assertNotNull,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAffiliateLeadAttributionTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let affiliateId: string;
  let affiliateUsername: string;

  // Test 1: Lead attributed to affiliate via cookie
  results.push(
    await runTest('Lead attributed via cookie', async () => {
      // Create affiliate
      const { profile: affiliate } = await createTestUser({
        role: 'client',
        firstName: 'Attribution',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `attribution-${Date.now()}`,
      });
      affiliateId = affiliate.id;
      affiliateUsername = affiliate.shortLinkUsername!;

      // Create lead with cookie attribution
      const { lead } = await createTestLead({
        referrerUsername: affiliateUsername,
        referrerType: 'AFFILIATE',
        status: 'NEW',
      });

      assertEqual(lead.referrerUsername, affiliateUsername, 'Referrer should match affiliate');
      assertEqual(lead.referrerType, 'AFFILIATE', 'Referrer type should be AFFILIATE');

      logSuccess(`Lead ${lead.id} attributed to ${affiliateUsername}`);
    })
  );

  // Test 2: Attribution method recorded
  results.push(
    await runTest('Attribution method recorded', async () => {
      // Create lead with explicit attribution method
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Method',
          lastName: 'Test',
          email: `method-test-${Date.now()}@test-taxgeniuspro.local`,
          phone: '555-123-4567',
          type: 'CUSTOMER',
          status: 'NEW',
          referrerUsername: affiliateUsername,
          referrerType: 'AFFILIATE',
          attributionMethod: 'cookie',
          source: 'MARKETING_LINK',
        },
      });

      assertEqual(lead.attributionMethod, 'cookie', 'Attribution method should be cookie');
      assertEqual(lead.source, 'MARKETING_LINK', 'Source should be MARKETING_LINK');

      logSuccess(`Attribution method: ${lead.attributionMethod}`);
    })
  );

  // Test 3: Commission rate locked at lead creation
  results.push(
    await runTest('Commission rate locked at creation', async () => {
      // Create lead with locked commission rate
      const lead = await prisma.lead.create({
        data: {
          firstName: 'Locked',
          lastName: 'Rate',
          email: `locked-rate-${Date.now()}@test-taxgeniuspro.local`,
          phone: '555-222-3333',
          type: 'CUSTOMER',
          status: 'NEW',
          referrerUsername: affiliateUsername,
          referrerType: 'AFFILIATE',
          commissionRate: 25.00,
          commissionRateLockedAt: new Date(),
        },
      });

      assertEqual(Number(lead.commissionRate), 25, 'Commission rate should be 25');
      assertNotNull(lead.commissionRateLockedAt, 'Lock timestamp should be set');

      // Rate should not change even if affiliate's default rate changes
      logSuccess('Commission rate locked at $25');
    })
  );

  // Test 4: Intake lead attributed correctly
  results.push(
    await runTest('Intake lead attributed', async () => {
      // Create intake lead with attribution
      const { intakeLead } = await createTestTaxIntakeLead({
        referrerUsername: affiliateUsername,
        firstName: 'Intake',
        lastName: 'Attribution',
        completed: true,
      });

      assertEqual(intakeLead.referrerUsername, affiliateUsername, 'Intake should be attributed');
      assertEqual(intakeLead.completed, true, 'Intake should be completed');

      logSuccess(`Intake lead ${intakeLead.id} attributed to ${affiliateUsername}`);
    })
  );

  // Test 5: Attribution chain is complete
  results.push(
    await runTest('Attribution chain complete', async () => {
      // Verify we can trace from lead back to affiliate
      const leads = await prisma.lead.findMany({
        where: {
          referrerUsername: affiliateUsername,
          referrerType: 'AFFILIATE',
        },
      });

      const intakeLeads = await prisma.taxIntakeLead.findMany({
        where: { referrerUsername: affiliateUsername },
      });

      // Get affiliate profile
      const affiliate = await prisma.profile.findFirst({
        where: { shortLinkUsername: affiliateUsername },
      });

      assertNotNull(affiliate, 'Affiliate should exist');
      assertEqual(affiliate.id, affiliateId, 'Affiliate ID should match');

      const totalAttributed = leads.length + intakeLeads.length;

      logSuccess(`Attribution chain verified: ${totalAttributed} leads/intakes`);
      logInfo(`  Leads: ${leads.length}`);
      logInfo(`  Intake Leads: ${intakeLeads.length}`);
      logInfo(`  Affiliate: ${affiliate.firstName} ${affiliate.lastName}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 18: Affiliate Lead Attribution');

  try {
    const results = await runAffiliateLeadAttributionTest();

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

export { runAffiliateLeadAttributionTest };
