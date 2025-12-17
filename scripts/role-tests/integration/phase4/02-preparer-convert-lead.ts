/**
 * Integration Test: Phase 4.2 - Preparer Converts Lead to Client
 *
 * Tests the lead conversion process including profile and tax return creation.
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
  createTestTaxReturn,
  createTestClientPreparerAssignment,
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
  getTestTaxYear,
} from '../../test-utils/index';

async function runPreparerConvertLeadTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testPreparerId: string;
  let testLeadId: string;
  let testLeadEmail: string;
  let clientProfileId: string;

  // Setup
  results.push(
    await runTest('Setup: Create preparer with qualified lead', async () => {
      const { profile } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Convert',
        lastName: 'Preparer',
        shortLinkUsername: `cvp${Date.now()}`,
      });
      testPreparerId = profile.id;

      // Create lead and mark it as "qualified" via contact notes
      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'Convert',
        lastName: `Client${Date.now()}`,
        assignedPreparerId: testPreparerId,
      });
      testLeadId = intakeLead.id;
      testLeadEmail = intakeLead.email;

      // Mark as qualified (contacted and ready for conversion)
      await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          lastContactedAt: new Date(),
          contactMethod: 'CALL',
          contactNotes: 'QUALIFIED: Ready for conversion.',
        },
      });

      logSuccess('Setup complete');
      logInfo(`  Lead: ${testLeadId}`);
      logInfo(`  Email: ${testLeadEmail}`);
    })
  );

  // Test 4.2.1: Create user for lead
  results.push(
    await runTest('4.2.1 Create user for lead', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      const user = await prisma.user.create({
        data: {
          email: lead!.email,
          name: `${lead!.first_name} ${lead!.last_name}`,
          emailVerified: new Date(),
        },
      });

      assertNotNull(user.id, 'User should be created');
      assertEqual(user.email, testLeadEmail, 'Email should match');
      logSuccess(`User created: ${user.id}`);
    })
  );

  // Test 4.2.2: Create client profile
  results.push(
    await runTest('4.2.2 Create client profile', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      const user = await prisma.user.findUnique({
        where: { email: testLeadEmail },
      });

      const profile = await prisma.profile.create({
        data: {
          userId: user!.id,
          role: 'client',
          firstName: lead!.first_name,
          lastName: lead!.last_name || '',
          phone: lead!.phone,
          affiliateStatus: 'APPROVED',
        },
      });

      clientProfileId = profile.id;
      assertNotNull(profile.id, 'Profile should be created');
      assertEqual(profile.role, 'client', 'Role should be client');
      assertEqual(profile.affiliateStatus, 'APPROVED', 'Should be auto-approved as affiliate');

      logSuccess(`Client profile created: ${profile.id}`);
    })
  );

  // Test 4.2.3: Create client-preparer assignment
  results.push(
    await runTest('4.2.3 Create client-preparer assignment', async () => {
      const { assignment } = await createTestClientPreparerAssignment({
        preparerId: testPreparerId,
        clientId: clientProfileId,
      });

      assertNotNull(assignment.id, 'Assignment should be created');
      assertEqual(assignment.preparerId, testPreparerId, 'Preparer should match');
      assertEqual(assignment.clientId, clientProfileId, 'Client should match');

      logSuccess('Client-preparer assignment created');
    })
  );

  // Test 4.2.4: Mark lead as converted
  results.push(
    await runTest('4.2.4 Mark lead as converted', async () => {
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: clientProfileId,
        },
      });

      assert(lead.convertedToClient, 'Should be marked as converted');
      assertNotNull(lead.convertedAt, 'convertedAt should be set');
      assertEqual(lead.profileId, clientProfileId, 'Should link to client profile');

      logSuccess('Lead marked as converted');
    })
  );

  // Test 4.2.5: Create tax return
  results.push(
    await runTest('4.2.5 Create tax return for client', async () => {
      const { taxReturn, taxYear } = await createTestTaxReturn({
        profileId: clientProfileId,
        status: 'DRAFT',
      });

      assertNotNull(taxReturn.id, 'Tax return should be created');
      assertEqual(taxReturn.profileId, clientProfileId, 'Should belong to client');
      assertEqual(taxReturn.taxYear, taxYear, 'Tax year should match');

      logSuccess(`Tax return created: ${taxReturn.id}`);
    })
  );

  // Test 4.2.6: Log conversion activity
  results.push(
    await runTest('4.2.6 Log conversion activity', async () => {
      const activity = await prisma.leadActivity.create({
        data: {
          leadId: testLeadId,
          activityType: 'CONVERTED',
          title: 'Lead converted to client',
          description: 'Lead successfully converted to client profile',
          metadata: {
            clientProfileId,
            preparerId: testPreparerId,
            convertedAt: new Date().toISOString(),
          },
          automated: false,
        },
      });

      assertNotNull(activity.id, 'Activity should be logged');
      logSuccess('Conversion activity logged');
    })
  );

  // Test 4.2.7: Verify complete conversion state
  results.push(
    await runTest('4.2.7 Verify complete conversion state', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
        include: { profile: true },
      });

      const profile = await prisma.profile.findUnique({
        where: { id: clientProfileId },
        include: { taxReturns: true },
      });

      const assignment = await prisma.clientPreparer.findFirst({
        where: {
          clientId: clientProfileId,
          preparerId: testPreparerId,
        },
      });

      assert(lead!.convertedToClient, 'Lead should be converted');
      assertNotNull(lead!.profile, 'Lead should link to profile');
      assertEqual(profile!.role, 'client', 'Profile should be client');
      assert(profile!.taxReturns.length > 0, 'Client should have tax return');
      assertNotNull(assignment, 'Client-preparer assignment should exist');

      logSuccess('Complete conversion verified');
      logInfo('  ✓ Lead marked as converted');
      logInfo('  ✓ Client profile created');
      logInfo('  ✓ Tax return created');
      logInfo('  ✓ Client-preparer assignment created');
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 4.2: Preparer Converts Lead to Client');

  try {
    const results = await runPreparerConvertLeadTests();
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
export { runPreparerConvertLeadTests };
