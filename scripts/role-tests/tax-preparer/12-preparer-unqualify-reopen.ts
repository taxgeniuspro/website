/**
 * Test 12: Tax Preparer Unqualify and Reopen Lead
 *
 * Validates the unqualify and reopen workflows for leads.
 *
 * Tests:
 * - 2.1: Unqualify lead with reason (wrong_state, no_income, etc.)
 * - 2.2: Verify cannot convert unqualified lead (should fail)
 * - 2.3: Reopen lead successfully
 * - 2.4: Verify reopened lead can now be converted
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

// Valid unqualify reasons
const UNQUALIFY_REASONS = [
  'wrong_state',
  'no_income',
  'already_filed',
  'unresponsive',
  'not_interested',
  'other',
] as const;

async function runUnqualifyReopenTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testLeadId: string;

  // Test 2.1: Unqualify lead with reason
  results.push(
    await runTest('2.1 Unqualify lead with reason', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Unqualify',
        lastName: 'Tester',
        shortLinkUsername: `unqualify-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Create intake lead
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        firstName: 'Unqualify',
        lastName: 'TestLead',
        email: `unqualify-lead-${Date.now()}@test-taxgeniuspro.local`,
      });
      testLeadId = intakeLead.id;

      // Verify lead is not unqualified initially
      assertEqual(intakeLead.unqualified, false, 'Lead should not be unqualified initially');

      // Unqualify the lead with a reason
      const unqualifyReason = 'wrong_state';
      const unqualifyNotes = 'Client lives in a state we do not service.';

      const unqualifiedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          unqualified: true,
          unqualifiedReason: unqualifyReason,
          unqualifiedNotes: unqualifyNotes,
          unqualifiedAt: new Date(),
        },
      });

      assertEqual(unqualifiedLead.unqualified, true, 'Lead should be unqualified');
      assertEqual(unqualifiedLead.unqualifiedReason, unqualifyReason, 'Reason should match');
      assertEqual(unqualifiedLead.unqualifiedNotes, unqualifyNotes, 'Notes should match');
      assertNotNull(unqualifiedLead.unqualifiedAt, 'UnqualifiedAt should be set');

      logSuccess(`Lead unqualified with reason: ${unqualifyReason}`);
      logInfo(`  Notes: ${unqualifyNotes}`);
      logInfo(`  At: ${unqualifiedLead.unqualifiedAt}`);
    })
  );

  // Test 2.2: Verify cannot convert unqualified lead
  results.push(
    await runTest('2.2 Cannot convert unqualified lead', async () => {
      // Fetch the unqualified lead
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assertEqual(lead!.unqualified, true, 'Lead should be unqualified');

      // Attempt to convert would fail in the API
      // Here we simulate the business logic check
      const canConvert = !lead!.unqualified && !lead!.convertedToClient;

      assertEqual(canConvert, false, 'Should not be able to convert unqualified lead');

      // Verify the lead is still not converted
      assertEqual(lead!.convertedToClient, false, 'Lead should not be converted');

      logSuccess('Conversion blocked for unqualified lead');
      logInfo(`  Unqualified: ${lead!.unqualified}`);
      logInfo(`  Converted: ${lead!.convertedToClient}`);
    })
  );

  // Test 2.3: Reopen lead successfully
  results.push(
    await runTest('2.3 Reopen lead successfully', async () => {
      const reopenNotes = 'Client moved to a serviced state, reopening lead.';

      // Reopen the lead
      const reopenedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          unqualified: false,
          // Keep the reason for history but clear the timestamp
          unqualifiedAt: null,
          // Append reopen note to existing notes
          contactNotes: reopenNotes,
        },
      });

      assertEqual(reopenedLead.unqualified, false, 'Lead should not be unqualified');
      assertEqual(reopenedLead.unqualifiedAt, null, 'UnqualifiedAt should be cleared');
      // Reason is kept for historical reference
      assertNotNull(reopenedLead.unqualifiedReason, 'Reason should be kept for history');
      assertEqual(reopenedLead.contactNotes, reopenNotes, 'Reopen notes should be set');

      logSuccess('Lead reopened successfully');
      logInfo(`  Unqualified: ${reopenedLead.unqualified}`);
      logInfo(`  Historical reason: ${reopenedLead.unqualifiedReason}`);
      logInfo(`  Reopen notes: ${reopenNotes}`);
    })
  );

  // Test 2.4: Verify reopened lead can be converted
  results.push(
    await runTest('2.4 Reopened lead can be converted', async () => {
      // Fetch the reopened lead
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assertEqual(lead!.unqualified, false, 'Lead should not be unqualified');

      // Verify conversion is now allowed
      const canConvert = !lead!.unqualified && !lead!.convertedToClient;
      assertEqual(canConvert, true, 'Should be able to convert reopened lead');

      // Create client profile for conversion
      const { profile: clientProfile } = await createTestUser({
        role: 'client',
        firstName: lead!.first_name,
        lastName: lead!.last_name,
        email: `converted-${Date.now()}@test-taxgeniuspro.local`,
      });

      // Perform conversion
      const convertedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: clientProfile.id,
        },
      });

      assertEqual(convertedLead.convertedToClient, true, 'Lead should be converted');
      assertNotNull(convertedLead.convertedAt, 'ConvertedAt should be set');
      assertEqual(convertedLead.profileId, clientProfile.id, 'Profile should be linked');

      logSuccess('Reopened lead successfully converted');
      logInfo(`  Converted to profile: ${clientProfile.id}`);
      logInfo(`  At: ${convertedLead.convertedAt}`);
    })
  );

  // Bonus: Test all unqualify reasons
  results.push(
    await runTest('2.5 Test all unqualify reasons', async () => {
      for (const reason of UNQUALIFY_REASONS) {
        // Create a new lead for each reason
        const { intakeLead } = await createTestTaxIntakeLead({
          assignedPreparerId: testPreparerId,
          firstName: `Reason`,
          lastName: reason,
          email: `reason-${reason}-${Date.now()}@test-taxgeniuspro.local`,
        });

        // Unqualify with this reason
        const notes = reason === 'other' ? 'Custom reason: client deceased.' : null;
        const unqualifiedLead = await prisma.taxIntakeLead.update({
          where: { id: intakeLead.id },
          data: {
            unqualified: true,
            unqualifiedReason: reason,
            unqualifiedNotes: notes,
            unqualifiedAt: new Date(),
          },
        });

        assertEqual(unqualifiedLead.unqualified, true, `Lead should be unqualified with reason: ${reason}`);
        assertEqual(unqualifiedLead.unqualifiedReason, reason, `Reason should be ${reason}`);

        // For 'other' reason, notes should be required
        if (reason === 'other') {
          assertNotNull(unqualifiedLead.unqualifiedNotes, 'Notes required for "other" reason');
        }
      }

      logSuccess(`All ${UNQUALIFY_REASONS.length} unqualify reasons tested`);
      logInfo(`  Reasons: ${UNQUALIFY_REASONS.join(', ')}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 12: Unqualify/Reopen Lead');

  try {
    const results = await runUnqualifyReopenTests();

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

export { runUnqualifyReopenTests };
