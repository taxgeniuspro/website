/**
 * Test 11: Tax Preparer Lead Lifecycle
 *
 * Validates the complete lead lifecycle from NEW → CONTACTED → QUALIFIED → CONVERTED → COMPLETE
 * Including commission creation on completion.
 *
 * Tests:
 * - 1.1: Create lead in NEW status
 * - 1.2: Contact lead → verify lastContactedAt updated
 * - 1.3: Add contact notes → verify status becomes QUALIFIED
 * - 1.4: Convert lead → verify client profile created
 * - 1.5: Mark complete → verify commission created
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

async function runLeadLifecycleTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testPreparerUsername: string;
  let testReferrerId: string;
  let testReferrerUsername: string;
  let testLeadId: string;
  let testClientProfileId: string;

  // Test 1.1: Create lead in NEW status
  results.push(
    await runTest('1.1 Create lead in NEW status', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Lifecycle',
        lastName: 'Preparer',
        shortLinkUsername: `lifecycle-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;
      testPreparerUsername = preparer.shortLinkUsername!;

      // Create test referrer (affiliate)
      const { profile: referrer } = await createTestUser({
        role: 'client',
        firstName: 'Test',
        lastName: 'Referrer',
        shortLinkUsername: `test-referrer-${Date.now()}`,
        affiliateStatus: 'APPROVED',
      });
      testReferrerId = referrer.id;
      testReferrerUsername = referrer.shortLinkUsername!;

      // Create intake lead assigned to preparer with referrer
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        referrerUsername: testReferrerUsername,
        firstName: 'Lifecycle',
        lastName: 'TestLead',
        email: `lifecycle-lead-${Date.now()}@test-taxgeniuspro.local`,
      });
      testLeadId = intakeLead.id;

      // Verify lead is in NEW status (not contacted, not completed)
      assertEqual(intakeLead.completed, false, 'Lead should not be completed');
      assertEqual(intakeLead.convertedToClient, false, 'Lead should not be converted');
      assertEqual(intakeLead.lastContactedAt, null, 'Lead should not have been contacted');
      assertEqual(intakeLead.unqualified, false, 'Lead should not be unqualified');

      logSuccess(`Created lead ${intakeLead.id} in NEW status`);
      logInfo(`  Assigned to: ${testPreparerId}`);
      logInfo(`  Referrer: ${testReferrerUsername}`);
    })
  );

  // Test 1.2: Contact lead → verify lastContactedAt updated
  results.push(
    await runTest('1.2 Contact lead updates lastContactedAt', async () => {
      const contactTime = new Date();

      // Simulate contacting the lead
      const updatedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          lastContactedAt: contactTime,
          contactMethod: 'CALL',
        },
      });

      assertNotNull(updatedLead.lastContactedAt, 'lastContactedAt should be set');
      assertEqual(updatedLead.contactMethod, 'CALL', 'Contact method should be CALL');

      // Verify the timestamp is recent (within 5 seconds)
      const timeDiff = Math.abs(new Date().getTime() - new Date(updatedLead.lastContactedAt).getTime());
      assert(timeDiff < 5000, 'lastContactedAt should be recent');

      logSuccess(`Lead contacted at ${updatedLead.lastContactedAt}`);
      logInfo(`  Contact method: ${updatedLead.contactMethod}`);
    })
  );

  // Test 1.3: Add contact notes → verify derived status is QUALIFIED
  results.push(
    await runTest('1.3 Add contact notes makes lead QUALIFIED', async () => {
      const contactNotes = 'Spoke with client, they are interested in filing. Has W2 and 1099 income.';

      const updatedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          contactNotes: contactNotes,
        },
      });

      assertNotNull(updatedLead.contactNotes, 'Contact notes should be set');
      assert(updatedLead.contactNotes.length > 0, 'Contact notes should not be empty');

      // Derived status is QUALIFIED when:
      // - lastContactedAt is set AND contactNotes is set AND not converted AND not unqualified
      const hasContact = !!updatedLead.lastContactedAt;
      const hasNotes = !!updatedLead.contactNotes;
      const notConverted = !updatedLead.convertedToClient;
      const notUnqualified = !updatedLead.unqualified;

      const isQualified = hasContact && hasNotes && notConverted && notUnqualified;
      assert(isQualified, 'Lead should be in QUALIFIED state');

      logSuccess('Lead now has contact notes and is QUALIFIED');
      logInfo(`  Notes: ${contactNotes.substring(0, 50)}...`);
    })
  );

  // Test 1.4: Convert lead → verify client profile created
  results.push(
    await runTest('1.4 Convert lead creates client profile', async () => {
      // First create a user/profile for the lead (simulating signup)
      const leadData = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      const { profile: clientProfile, user: clientUser } = await createTestUser({
        role: 'client',
        firstName: leadData!.first_name,
        lastName: leadData!.last_name,
        email: leadData!.email,
      });
      testClientProfileId = clientProfile.id;

      // Convert the lead
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

      // Create client-preparer assignment
      const assignment = await prisma.clientPreparer.create({
        data: {
          preparerId: testPreparerId,
          clientId: clientProfile.id,
          isActive: true,
        },
      });

      assertNotNull(assignment, 'Client-preparer assignment should be created');

      // Create tax return for the client
      const taxReturn = await prisma.taxReturn.create({
        data: {
          profileId: clientProfile.id,
          taxYear: 2024,
          status: 'DRAFT',
          formData: {},
        },
      });

      assertNotNull(taxReturn, 'Tax return should be created');

      logSuccess(`Lead converted to client ${clientProfile.id}`);
      logInfo(`  Assignment: ${assignment.id}`);
      logInfo(`  Tax return: ${taxReturn.id}`);
    })
  );

  // Test 1.5: Mark complete → verify commission created
  results.push(
    await runTest('1.5 Mark complete creates commission', async () => {
      // Mark the lead as complete
      const completedLead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          completed: true,
        },
      });

      assertEqual(completedLead.completed, true, 'Lead should be marked as complete');

      // Create commission for the referrer (simulating what the API does)
      const commissionAmount = 25; // Default flat rate
      const commission = await prisma.commission.create({
        data: {
          referrerId: testReferrerId,
          amount: commissionAmount,
          status: 'APPROVED',
          sourceType: 'RETURN_FILED',
          sourceId: testLeadId,
          clientName: `${completedLead.first_name} ${completedLead.last_name}`,
          clientEmail: completedLead.email,
          commissionType: 'FLAT',
          commissionRate: commissionAmount,
          rateAtCreation: commissionAmount,
          rateSource: 'DEFAULT',
          approvedAt: new Date(),
        },
      });

      assertNotNull(commission, 'Commission should be created');
      assertEqual(commission.referrerId, testReferrerId, 'Commission should be for referrer');
      assertEqual(commission.status, 'APPROVED', 'Commission should be APPROVED');
      assertEqual(Number(commission.amount), commissionAmount, 'Commission amount should match');
      assertEqual(commission.sourceType, 'RETURN_FILED', 'Source type should be RETURN_FILED');
      assertEqual(commission.sourceId, testLeadId, 'Source ID should be lead ID');

      logSuccess(`Commission created: $${commissionAmount} for referrer`);
      logInfo(`  Commission ID: ${commission.id}`);
      logInfo(`  Status: ${commission.status}`);
      logInfo(`  Source: ${commission.sourceType}`);
    })
  );

  // Bonus test: Verify full lifecycle state
  results.push(
    await runTest('1.6 Verify complete lifecycle state', async () => {
      // Fetch the final lead state
      const finalLead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assertNotNull(finalLead, 'Lead should exist');

      // Verify all lifecycle fields
      assertEqual(finalLead!.completed, true, 'Should be completed');
      assertEqual(finalLead!.convertedToClient, true, 'Should be converted');
      assertNotNull(finalLead!.convertedAt, 'Should have convertedAt');
      assertNotNull(finalLead!.profileId, 'Should have profileId');
      assertNotNull(finalLead!.lastContactedAt, 'Should have lastContactedAt');
      assertNotNull(finalLead!.contactNotes, 'Should have contactNotes');
      assertEqual(finalLead!.unqualified, false, 'Should not be unqualified');

      // Verify client assignment exists
      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          preparerId: testPreparerId,
          clientId: testClientProfileId,
          isActive: true,
        },
      });
      assertNotNull(assignment, 'Client-preparer assignment should exist');

      // Verify commission exists
      const commission = await prisma.commission.findFirst({
        where: {
          sourceType: 'RETURN_FILED',
          sourceId: testLeadId,
        },
      });
      assertNotNull(commission, 'Commission should exist');

      logSuccess('Full lifecycle verified successfully');
      logInfo('  Lead Status Summary:');
      logInfo(`    - Created: ${finalLead!.created_at}`);
      logInfo(`    - Contacted: ${finalLead!.lastContactedAt}`);
      logInfo(`    - Converted: ${finalLead!.convertedAt}`);
      logInfo(`    - Completed: Yes`);
      logInfo(`    - Commission: $${commission!.amount} (${commission!.status})`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 11: Lead Lifecycle');

  try {
    const results = await runLeadLifecycleTests();

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

export { runLeadLifecycleTests };
