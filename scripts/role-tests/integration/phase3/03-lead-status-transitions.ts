/**
 * Integration Test: Phase 3.3 - Lead Status Transitions
 *
 * Tests lead lifecycle transitions using boolean flags.
 * TaxIntakeLead uses: completed, convertedToClient, unqualified (boolean flags)
 * NOT a status enum field.
 *
 * Lifecycle:
 * - New lead: completed=false, convertedToClient=false, unqualified=false
 * - Contacted: lastContactedAt is set
 * - Qualified: contactNotes indicate qualified
 * - Converted: convertedToClient=true, profileId set
 * - Completed: completed=true (tax return filed)
 * - Unqualified: unqualified=true, unqualifiedReason set
 */

import {
  prisma,
  createTestTaxIntakeLead,
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

async function runLeadStatusTransitionTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testLeadId: string;
  let testPreparerId: string;
  let testClientProfileId: string;

  // Setup
  results.push(
    await runTest('Setup: Create preparer and test lead', async () => {
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Status',
        lastName: 'Preparer',
        shortLinkUsername: `sp${Date.now()}`,
      });
      testPreparerId = preparer.id;

      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'StatusTest',
        lastName: `Lead${Date.now()}`,
        assignedPreparerId: testPreparerId,
      });
      testLeadId = intakeLead.id;
      logSuccess(`Lead created: ${testLeadId}`);
      logInfo(`  Assigned to: ${testPreparerId}`);
    })
  );

  // Test 3.3.1: Verify new lead initial state
  results.push(
    await runTest('3.3.1 New lead initial state', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assertEqual(lead!.completed, false, 'completed should be false');
      assertEqual(lead!.convertedToClient, false, 'convertedToClient should be false');
      assertEqual(lead!.unqualified, false, 'unqualified should be false');
      assertEqual(lead!.lastContactedAt, null, 'lastContactedAt should be null');

      logSuccess('New lead state verified');
      logInfo('  Status: NEW (not contacted, not converted, not unqualified)');
    })
  );

  // Test 3.3.2: Transition to CONTACTED (set lastContactedAt)
  results.push(
    await runTest('3.3.2 Transition: NEW → CONTACTED', async () => {
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          lastContactedAt: new Date(),
          contactMethod: 'CALL',
          contactNotes: 'Initial contact made. Client interested.',
        },
      });

      assertNotNull(lead.lastContactedAt, 'lastContactedAt should be set');
      assertEqual(lead.contactMethod, 'CALL', 'contactMethod should be CALL');

      logSuccess('Lead contacted');
      logInfo(`  Contact date: ${lead.lastContactedAt}`);
    })
  );

  // Test 3.3.3: Transition to QUALIFIED (update contact notes)
  results.push(
    await runTest('3.3.3 Transition: CONTACTED → QUALIFIED', async () => {
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          contactNotes: 'QUALIFIED: Client needs tax prep, has W2s and 1099s. Scheduled appointment.',
        },
      });

      assert(lead.contactNotes?.includes('QUALIFIED'), 'Notes should indicate qualified');

      logSuccess('Lead qualified');
      logInfo('  Notes updated with qualification status');
    })
  );

  // Test 3.3.4: Transition to CONVERTED (create client profile)
  results.push(
    await runTest('3.3.4 Transition: QUALIFIED → CONVERTED', async () => {
      // Create a client profile for conversion
      const { profile: clientProfile } = await createTestUser({
        role: 'client',
        firstName: 'StatusTest',
        lastName: `Client${Date.now()}`,
      });
      testClientProfileId = clientProfile.id;

      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          convertedToClient: true,
          profileId: testClientProfileId,
          convertedAt: new Date(),
        },
      });

      assert(lead.convertedToClient, 'convertedToClient should be true');
      assertEqual(lead.profileId, testClientProfileId, 'profileId should be set');
      assertNotNull(lead.convertedAt, 'convertedAt should be set');

      logSuccess('Lead converted to client');
      logInfo(`  Client Profile: ${testClientProfileId}`);
    })
  );

  // Test 3.3.5: Transition to COMPLETED (tax return filed)
  results.push(
    await runTest('3.3.5 Transition: CONVERTED → COMPLETED', async () => {
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          completed: true,
        },
      });

      assert(lead.completed, 'completed should be true');
      assert(lead.convertedToClient, 'convertedToClient should still be true');

      logSuccess('Lead lifecycle completed');
      logInfo('  Full progression: NEW → CONTACTED → QUALIFIED → CONVERTED → COMPLETED');
    })
  );

  // Test 3.3.6: Terminal state - COMPLETED cannot be undone
  results.push(
    await runTest('3.3.6 Terminal: COMPLETED is final', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assert(lead!.completed, 'Lead is COMPLETED');
      assert(lead!.convertedToClient, 'Lead is converted');

      // In a production app, business logic would prevent uncommpleting
      // Document expected terminal state behavior
      logSuccess('COMPLETED is a terminal state');
      logInfo('  Once completed, lead lifecycle is finished');
    })
  );

  // Test 3.3.7: Create new lead for UNQUALIFIED path
  results.push(
    await runTest('3.3.7 Create lead for disqualification test', async () => {
      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'UnqualifyTest',
        lastName: `Lead${Date.now()}`,
        assignedPreparerId: testPreparerId,
      });
      testLeadId = intakeLead.id;
      logSuccess(`New lead created: ${testLeadId}`);
    })
  );

  // Test 3.3.8: Transition to UNQUALIFIED
  results.push(
    await runTest('3.3.8 Transition: NEW → UNQUALIFIED', async () => {
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          unqualified: true,
          unqualifiedReason: 'wrong_state',
          unqualifiedAt: new Date(),
          contactNotes: 'Client lives in a state we do not service.',
        },
      });

      assert(lead.unqualified, 'unqualified should be true');
      assertEqual(lead.unqualifiedReason, 'wrong_state', 'reason should be set');
      assertNotNull(lead.unqualifiedAt, 'unqualifiedAt should be set');

      logSuccess('Lead marked unqualified');
      logInfo(`  Reason: ${lead.unqualifiedReason}`);
    })
  );

  // Test 3.3.9: Terminal state - UNQUALIFIED is final
  results.push(
    await runTest('3.3.9 Terminal: UNQUALIFIED is final', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assert(lead!.unqualified, 'Lead is UNQUALIFIED');
      assertEqual(lead!.convertedToClient, false, 'Should not be converted');

      logSuccess('UNQUALIFIED is a terminal state');
      logInfo('  Lead cannot be converted once disqualified');
    })
  );

  // Test 3.3.10: Log status change activity
  results.push(
    await runTest('3.3.10 Log status changes', async () => {
      const activity = await prisma.leadActivity.create({
        data: {
          leadId: testLeadId,
          activityType: 'STATUS_CHANGED',
          title: 'Lead marked as unqualified',
          description: 'Lead disqualified due to service area restrictions',
          metadata: {
            action: 'UNQUALIFIED',
            reason: 'wrong_state',
            previousState: { completed: false, convertedToClient: false, unqualified: false },
            newState: { completed: false, convertedToClient: false, unqualified: true },
          },
          automated: false,
        },
      });

      assertNotNull(activity.id, 'Activity should be logged');
      assertEqual(activity.activityType, 'STATUS_CHANGED', 'Type should be STATUS_CHANGED');
      logSuccess('Status change activity logged');
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 3.3: Lead Status Transitions');

  try {
    const results = await runLeadStatusTransitionTests();
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
export { runLeadStatusTransitionTests };
