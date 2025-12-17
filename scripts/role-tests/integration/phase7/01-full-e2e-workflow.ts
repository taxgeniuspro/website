/**
 * Integration Test: Phase 7.1 - Complete End-to-End Workflow
 *
 * Tests the full cross-role workflow:
 * 1. Admin approves new preparer → tracking code assigned
 * 2. Preparer gets marketing links
 * 3. Affiliate refers new customer
 * 4. Customer fills intake form → attributed to affiliate
 * 5. Admin assigns lead to preparer
 * 6. Preparer contacts and qualifies lead
 * 7. Customer signs up → lead converts to client
 * 8. Preparer completes tax return
 * 9. Commission created for affiliate (PENDING)
 * 10. Admin approves commission
 * 11. Affiliate requests payout
 * 12. Admin processes payout
 */

import {
  prisma,
  createTestUser,
  createTestPreparerApplication,
  createTestTaxIntakeLead,
  createTestTaxReturn,
  createTestCommission,
  createTestClientPreparerAssignment,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThan,
  logHeader,
  logSuccess,
  logInfo,
  logError,
  TestResult,
  cleanupAllTestData,
  getTestTaxYear,
} from '../../test-utils/index';

async function runFullE2EWorkflowTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // State tracking across steps
  let adminId: string;
  let preparerApplicationId: string;
  let preparerId: string;
  let preparerTrackingCode: string;
  let affiliateId: string;
  let affiliateTrackingCode: string;
  let intakeLeadId: string;
  let clientUserId: string;
  let clientProfileId: string;
  let taxReturnId: string;
  let commissionId: string;

  logHeader('Phase 7.1: Complete End-to-End Workflow');
  logInfo('This test validates the full cross-role integration.');
  console.log('');

  // Step 1: Create admin (for approvals)
  results.push(
    await runTest('Step 1: Create admin user', async () => {
      const { profile } = await createTestUser({
        role: 'admin',
        firstName: 'E2E',
        lastName: 'Admin',
      });
      adminId = profile.id;
      logSuccess(`Admin created: ${adminId}`);
    })
  );

  // Step 2: Create preparer application and approve
  results.push(
    await runTest('Step 2: Approve preparer application', async () => {
      // Create application
      const { application } = await createTestPreparerApplication({
        firstName: 'E2E',
        lastName: 'Preparer',
        status: 'PENDING',
      });
      preparerApplicationId = application.id;

      // Approve and create preparer
      await prisma.preparerApplication.update({
        where: { id: preparerApplicationId },
        data: { status: 'APPROVED', stage: 'DECISION', convertedAt: new Date() },
      });

      // Create user and profile
      const user = await prisma.user.create({
        data: {
          email: application.email,
          name: `${application.firstName} ${application.lastName}`,
          emailVerified: new Date(),
        },
      });

      const trackingCode = `e2e${Date.now()}`;
      const profile = await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'tax_preparer',
          firstName: application.firstName,
          lastName: application.lastName,
          phone: application.phone,
          affiliateStatus: 'APPROVED',
          trackingCode,
          trackingCodeFinalized: true,
          shortLinkUsername: trackingCode,
        },
      });

      preparerId = profile.id;
      preparerTrackingCode = trackingCode;

      // Link application to profile
      await prisma.preparerApplication.update({
        where: { id: preparerApplicationId },
        data: { convertedProfileId: preparerId },
      });

      logSuccess(`Preparer approved: ${preparerId}`);
      logInfo(`  Tracking code: ${preparerTrackingCode}`);
    })
  );

  // Step 3: Create marketing links for preparer
  results.push(
    await runTest('Step 3: Generate preparer marketing links', async () => {
      const baseUrl = 'https://taxgeniuspro.tax';
      const linkTypes = ['lead', 'intake', 'appt'];

      for (const suffix of linkTypes) {
        await prisma.marketingLink.create({
          data: {
            code: `${preparerTrackingCode}-${suffix}`,
            url: `${baseUrl}/contact?ref=${preparerTrackingCode}`,
            shortUrl: `${baseUrl}/go/${preparerTrackingCode}-${suffix}`,
            title: `${suffix.charAt(0).toUpperCase() + suffix.slice(1)} Link`,
            creatorId: preparerId,
            creatorType: 'TAX_PREPARER',
            linkType: 'REFERRAL',
            targetPage: '/contact',
            isActive: true,
          },
        });
      }

      const links = await prisma.marketingLink.count({
        where: { creatorId: preparerId },
      });

      assertEqual(links, 3, 'Should have 3 marketing links');
      logSuccess('Marketing links created');
    })
  );

  // Step 4: Create affiliate (existing client)
  results.push(
    await runTest('Step 4: Create affiliate client', async () => {
      const { profile } = await createTestUser({
        role: 'client',
        firstName: 'E2E',
        lastName: 'Affiliate',
        affiliateStatus: 'APPROVED',
        shortLinkUsername: `aff${Date.now()}`,
      });

      affiliateId = profile.id;
      affiliateTrackingCode = profile.customTrackingCode || profile.shortLinkUsername || '';

      // Create affiliate's marketing link
      await prisma.marketingLink.create({
        data: {
          code: `${affiliateTrackingCode}-intake`,
          url: `https://taxgeniuspro.tax/start-filing/form?ref=${affiliateTrackingCode}`,
          shortUrl: `https://taxgeniuspro.tax/go/${affiliateTrackingCode}-intake`,
          title: 'Affiliate Intake',
          creatorId: affiliateId,
          creatorType: 'AFFILIATE',
          linkType: 'REFERRAL',
          targetPage: '/start-filing/form',
          isActive: true,
        },
      });

      logSuccess(`Affiliate created: ${affiliateId}`);
      logInfo(`  Tracking code: ${affiliateTrackingCode}`);
    })
  );

  // Step 5: New customer fills intake form (attributed to affiliate)
  results.push(
    await runTest('Step 5: Customer fills intake form (affiliate referral)', async () => {
      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'E2E',
        lastName: 'Customer',
        referrerUsername: affiliateTrackingCode,
        // NOT assigned to preparer yet - admin will do this
      });

      intakeLeadId = intakeLead.id;

      assertNotNull(intakeLead.id, 'Intake lead created');
      assertEqual(intakeLead.referrerUsername, affiliateTrackingCode, 'Attributed to affiliate');

      logSuccess(`Lead created: ${intakeLeadId}`);
      logInfo(`  Attributed to: ${affiliateTrackingCode}`);
    })
  );

  // Step 6: Admin assigns lead to preparer
  results.push(
    await runTest('Step 6: Admin assigns lead to preparer', async () => {
      await prisma.taxIntakeLead.update({
        where: { id: intakeLeadId },
        data: { assignedPreparerId: preparerId },
      });

      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: intakeLeadId },
      });

      assertEqual(lead!.assignedPreparerId, preparerId, 'Lead assigned to preparer');
      logSuccess('Lead assigned to preparer');
    })
  );

  // Step 7: Preparer contacts and qualifies lead
  results.push(
    await runTest('Step 7: Preparer contacts lead', async () => {
      await prisma.taxIntakeLead.update({
        where: { id: intakeLeadId },
        data: {
          lastContactedAt: new Date(),
          contactMethod: 'CALL',
          contactNotes: 'Discussed filing needs. Client interested.',
        },
      });

      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: intakeLeadId },
      });

      assertNotNull(lead!.lastContactedAt, 'Contact date set');
      logSuccess('Lead contacted');
    })
  );

  // Step 8: Customer signs up → lead converts to client
  results.push(
    await runTest('Step 8: Lead converts to client', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: intakeLeadId },
      });

      // Create user for customer
      const user = await prisma.user.create({
        data: {
          email: lead!.email,
          name: `${lead!.first_name} ${lead!.last_name}`,
          emailVerified: new Date(),
        },
      });
      clientUserId = user.id;

      // Create client profile
      const profile = await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'client',
          firstName: lead!.first_name,
          lastName: lead!.last_name || '',
          phone: lead!.phone,
          affiliateStatus: 'APPROVED', // Auto-approved per system config
        },
      });
      clientProfileId = profile.id;

      // Create client-preparer assignment
      await createTestClientPreparerAssignment({
        preparerId,
        clientId: clientProfileId,
      });

      // Mark lead as converted
      await prisma.taxIntakeLead.update({
        where: { id: intakeLeadId },
        data: {
          profileId: clientProfileId,
          convertedToClient: true,
        },
      });

      logSuccess(`Client created: ${clientProfileId}`);
      logInfo(`  Assigned to preparer: ${preparerId}`);
    })
  );

  // Step 9: Preparer completes tax return
  results.push(
    await runTest('Step 9: Preparer completes tax return', async () => {
      const { taxReturn } = await createTestTaxReturn({
        profileId: clientProfileId,
        status: 'ACCEPTED',
        refundAmount: 2500,
      });
      taxReturnId = taxReturn.id;

      // Update client profile
      await prisma.profile.update({
        where: { id: clientProfileId },
        data: {
          hasFiledTaxes: true,
          firstFilingDate: new Date(),
        },
      });

      logSuccess(`Tax return filed: ${taxReturnId}`);
      logInfo(`  Refund: $2,500`);
    })
  );

  // Step 10: Commission created for affiliate
  results.push(
    await runTest('Step 10: Commission created for affiliate', async () => {
      const { commission } = await createTestCommission({
        referrerId: affiliateId,
        amount: 50, // Tier 1 rate
        status: 'PENDING',
      });
      commissionId = commission.id;

      assertEqual(commission.status, 'PENDING', 'Commission status is PENDING');
      logSuccess(`Commission created: ${commissionId}`);
      logInfo(`  Amount: $50`);
      logInfo(`  Status: PENDING`);
    })
  );

  // Step 11: Admin approves commission
  results.push(
    await runTest('Step 11: Admin approves commission', async () => {
      await prisma.commission.update({
        where: { id: commissionId },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminId,
        },
      });

      const commission = await prisma.commission.findUnique({
        where: { id: commissionId },
      });

      assertEqual(commission!.status, 'APPROVED', 'Commission approved');
      assertNotNull(commission!.approvedAt, 'Approval date set');

      logSuccess('Commission approved');
    })
  );

  // Step 12: Mark commission as paid
  results.push(
    await runTest('Step 12: Admin processes payout', async () => {
      const paymentRef = `PAY-E2E-${Date.now()}`;

      await prisma.commission.update({
        where: { id: commissionId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentRef,
        },
      });

      const commission = await prisma.commission.findUnique({
        where: { id: commissionId },
      });

      assertEqual(commission!.status, 'PAID', 'Commission paid');
      assertEqual(commission!.paymentRef, paymentRef, 'Payment ref recorded');

      logSuccess('Payout processed');
      logInfo(`  Payment Ref: ${paymentRef}`);
    })
  );

  // Final verification
  results.push(
    await runTest('Final: Verify complete workflow state', async () => {
      // Verify all entities
      const application = await prisma.preparerApplication.findUnique({
        where: { id: preparerApplicationId },
      });
      assertEqual(application!.status, 'APPROVED', 'Application approved');

      const preparer = await prisma.profile.findUnique({
        where: { id: preparerId },
      });
      assertEqual(preparer!.role, 'tax_preparer', 'Preparer role');

      const links = await prisma.marketingLink.count({
        where: { creatorId: preparerId },
      });
      assertEqual(links, 3, 'Preparer has 3 links');

      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: intakeLeadId },
      });
      assert(lead!.convertedToClient, 'Lead converted');

      const client = await prisma.profile.findUnique({
        where: { id: clientProfileId },
      });
      assert(client!.hasFiledTaxes, 'Client filed taxes');

      const commission = await prisma.commission.findUnique({
        where: { id: commissionId },
      });
      assertEqual(commission!.status, 'PAID', 'Commission paid');

      logSuccess('Complete workflow verified!');
      logInfo('');
      logInfo('Workflow Summary:');
      logInfo('  1. ✓ Preparer application approved');
      logInfo('  2. ✓ Marketing links generated');
      logInfo('  3. ✓ Affiliate created');
      logInfo('  4. ✓ Customer filled intake form');
      logInfo('  5. ✓ Admin assigned lead to preparer');
      logInfo('  6. ✓ Preparer contacted lead');
      logInfo('  7. ✓ Lead converted to client');
      logInfo('  8. ✓ Tax return completed');
      logInfo('  9. ✓ Commission created');
      logInfo('  10. ✓ Commission approved');
      logInfo('  11. ✓ Payout processed');
    })
  );

  return results;
}

async function main() {
  try {
    const results = await runFullE2EWorkflowTests();
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log('\n' + '═'.repeat(50));
    console.log(' Full E2E Workflow Results');
    console.log('═'.repeat(50));
    results.forEach((r) => {
      const status = r.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`  ${status} ${r.testName} (${r.duration}ms)`);
      if (!r.passed && r.error) console.log(`         Error: ${r.error}`);
    });
    console.log('═'.repeat(50));
    console.log(`\n  Results: ${passed}/${results.length} passed`);

    if (failed > 0) {
      console.log(`  \x1b[31m${failed} tests failed\x1b[0m`);
      process.exit(1);
    }

    logInfo('Cleaning up test data...');
    await cleanupAllTestData();
    logSuccess('All tests passed!');
    process.exit(0);
  } catch (error) {
    logError(`Test suite error: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
export { runFullE2EWorkflowTests };
