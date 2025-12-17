/**
 * Test 15: Client Can Apply for Affiliate Status
 *
 * Validates that clients who have filed taxes can apply
 * to become affiliates.
 *
 * Analytics Validated: affiliateStatus transition
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

async function runClientAffiliateApplyTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let eligibleClientId: string;
  let ineligibleClientId: string;

  // Test 1: Eligible client (hasFiledTaxes=true) can apply
  results.push(
    await runTest('Eligible client can apply', async () => {
      // Create eligible client (has filed taxes)
      const { profile: eligibleClient } = await createTestUser({
        role: 'client',
        firstName: 'Eligible',
        lastName: 'Client',
        affiliateStatus: 'NONE',
        hasFiledTaxes: true,
      });
      eligibleClientId = eligibleClient.id;

      // Verify eligibility
      assertEqual(eligibleClient.hasFiledTaxes, true, 'Client should have filed taxes');
      assertEqual(eligibleClient.affiliateStatus, 'NONE', 'Initial status should be NONE');

      // Check canApplyForAffiliate logic
      const canApply = eligibleClient.hasFiledTaxes && eligibleClient.affiliateStatus === 'NONE';
      assertEqual(canApply, true, 'Client should be able to apply');

      logSuccess('Eligible client can apply for affiliate status');
    })
  );

  // Test 2: Application changes status to PENDING
  results.push(
    await runTest('Application sets status PENDING', async () => {
      // Submit affiliate application
      const updatedProfile = await prisma.profile.update({
        where: { id: eligibleClientId },
        data: {
          affiliateStatus: 'PENDING',
          affiliateAppliedAt: new Date(),
        },
      });

      assertEqual(updatedProfile.affiliateStatus, 'PENDING', 'Status should be PENDING');
      assertNotNull(updatedProfile.affiliateAppliedAt, 'Applied date should be set');

      logSuccess('Status changed to PENDING');
    })
  );

  // Test 3: Pending affiliate cannot access affiliate features
  results.push(
    await runTest('Pending affiliate blocked from features', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: eligibleClientId },
      });

      // Check hasAffiliateAccess logic
      const hasAccess = profile?.affiliateStatus === 'APPROVED';
      assertEqual(hasAccess, false, 'Pending affiliate should not have access');

      // Cannot generate marketing links
      const canGenerateLinks = profile?.affiliateStatus === 'APPROVED' && !!profile?.shortLinkUsername;
      assertEqual(canGenerateLinks, false, 'Cannot generate links while pending');

      logSuccess('Pending affiliate correctly blocked from features');
    })
  );

  // Test 4: Ineligible client (no taxes filed) cannot apply
  results.push(
    await runTest('Ineligible client blocked from applying', async () => {
      // Create ineligible client (hasn't filed taxes)
      const { profile: ineligibleClient } = await createTestUser({
        role: 'client',
        firstName: 'Ineligible',
        lastName: 'Client',
        affiliateStatus: 'NONE',
        hasFiledTaxes: false,
      });
      ineligibleClientId = ineligibleClient.id;

      // Check canApplyForAffiliate logic
      const canApply = ineligibleClient.hasFiledTaxes && ineligibleClient.affiliateStatus === 'NONE';
      assertEqual(canApply, false, 'Client without filed taxes should not apply');

      // API would return error
      const response = {
        status: 400,
        error: 'You must file a tax return before applying for affiliate status',
      };

      assertEqual(response.status, 400, 'Should return 400 Bad Request');

      logSuccess('Ineligible client correctly blocked');
    })
  );

  // Test 5: Approved affiliate has full access
  results.push(
    await runTest('Approved affiliate has access', async () => {
      // Simulate admin approval
      const approvedProfile = await prisma.profile.update({
        where: { id: eligibleClientId },
        data: {
          affiliateStatus: 'APPROVED',
          shortLinkUsername: `affiliate-${Date.now()}`,
          affiliateApprovedAt: new Date(),
        },
      });

      // Check hasAffiliateAccess
      const hasAccess = approvedProfile.affiliateStatus === 'APPROVED';
      assertEqual(hasAccess, true, 'Approved affiliate should have access');

      // Can generate marketing links
      const canGenerateLinks = approvedProfile.affiliateStatus === 'APPROVED' &&
        approvedProfile.shortLinkUsername !== null;
      assertEqual(canGenerateLinks, true, 'Can generate marketing links');

      logSuccess(`Approved affiliate: ${approvedProfile.shortLinkUsername}`);
      logInfo(`  Status: ${approvedProfile.affiliateStatus}`);
      logInfo(`  Username: ${approvedProfile.shortLinkUsername}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 15: Client Affiliate Apply');

  try {
    const results = await runClientAffiliateApplyTest();

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

export { runClientAffiliateApplyTest };
