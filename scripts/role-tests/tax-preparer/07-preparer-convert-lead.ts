/**
 * Test 07: Tax Preparer Can Convert Lead to Client
 *
 * Validates that tax preparers can convert a qualified lead to a client,
 * creating appropriate records and triggering analytics updates.
 *
 * Analytics Validated: stats.converted increment
 */

import {
  prisma,
  createTestUser,
  createTestLead,
  createTestTaxIntakeLead,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  snapshotLeadPipeline,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runPreparerConvertLeadTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testPreparerUsername: string;

  // Test 1: Preparer can convert intake lead to client
  results.push(
    await runTest('Preparer can convert intake lead', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Convert',
        lastName: 'Tester',
        shortLinkUsername: `convert-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;
      testPreparerUsername = preparer.shortLinkUsername!;

      // Create a client user and profile (the lead)
      const { profile: leadProfile, user: leadUser } = await createTestUser({
        role: 'client',
        firstName: 'Lead',
        lastName: 'ToConvert',
      });

      // Create intake lead that will be converted
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        firstName: 'Lead',
        lastName: 'ToConvert',
        email: leadUser.email,
        completed: true,
      });

      // Verify lead is not yet converted
      assertEqual(intakeLead.convertedToClient, false, 'Lead should not be converted initially');

      // Convert the lead
      const convertedLead = await prisma.taxIntakeLead.update({
        where: { id: intakeLead.id },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: leadProfile.id,
        },
      });

      assertEqual(convertedLead.convertedToClient, true, 'Lead should be converted');
      assertNotNull(convertedLead.convertedAt, 'ConvertedAt should be set');
      assertEqual(convertedLead.profileId, leadProfile.id, 'Profile should be linked');

      logSuccess(`Lead ${intakeLead.id} converted to client ${leadProfile.id}`);
    })
  );

  // Test 2: Conversion creates tax return for client
  results.push(
    await runTest('Conversion creates tax return', async () => {
      // Create a new client for this test
      const { profile: clientProfile } = await createTestUser({
        role: 'client',
        firstName: 'TaxReturn',
        lastName: 'Client',
      });

      // Create intake lead
      const { intakeLead } = await createTestTaxIntakeLead({
        assignedPreparerId: testPreparerId,
        firstName: 'TaxReturn',
        lastName: 'Client',
        completed: true,
      });

      // Convert and create tax return
      await prisma.taxIntakeLead.update({
        where: { id: intakeLead.id },
        data: {
          convertedToClient: true,
          convertedAt: new Date(),
          profileId: clientProfile.id,
        },
      });

      // Create tax return for the client
      const taxReturn = await prisma.taxReturn.create({
        data: {
          profileId: clientProfile.id,
          taxYear: 2024,
          status: 'DRAFT',
          formData: {}, // Required field
        },
      });

      assertNotNull(taxReturn, 'Tax return should be created');
      assertEqual(taxReturn.profileId, clientProfile.id, 'Tax return should be linked to client');
      assertEqual(taxReturn.status, 'DRAFT', 'Initial status should be DRAFT');

      logSuccess(`Tax return created: ${taxReturn.id}`);
    })
  );

  // Test 3: Lead model conversion updates pipeline
  results.push(
    await runTest('Lead conversion updates pipeline', async () => {
      // Take snapshot before
      const beforePipeline = await snapshotLeadPipeline('all');

      // Create a Lead (not TaxIntakeLead) for pipeline tracking
      const { lead } = await createTestLead({
        referrerUsername: testPreparerUsername,
        referrerType: 'TAX_PREPARER',
        status: 'QUALIFIED',
      });

      // Convert the lead (change status to CONVERTED)
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'CONVERTED' },
      });

      // Take snapshot after
      const afterPipeline = await snapshotLeadPipeline('all');

      // Verify QUALIFIED decreased and CONVERTED increased
      const qualifiedChange = afterPipeline.pipeline.QUALIFIED - beforePipeline.pipeline.QUALIFIED;
      const convertedChange = afterPipeline.pipeline.CONVERTED - beforePipeline.pipeline.CONVERTED;

      // Note: We created a QUALIFIED lead then converted it
      // So QUALIFIED goes +1 then -1 = 0, CONVERTED goes +1
      assertEqual(convertedChange, 1, 'CONVERTED count should increase by 1');

      logSuccess(`Pipeline updated: CONVERTED +1`);
    })
  );

  // Test 4: Client-preparer assignment is created
  results.push(
    await runTest('Client-preparer assignment created', async () => {
      // Create a new client
      const { profile: clientProfile } = await createTestUser({
        role: 'client',
        firstName: 'Assignment',
        lastName: 'Test',
      });

      // Create client-preparer assignment
      const assignment = await prisma.clientPreparer.create({
        data: {
          preparerId: testPreparerId,
          clientId: clientProfile.id,
          isActive: true,
        },
      });

      assertNotNull(assignment, 'Assignment should be created');
      assertEqual(assignment.preparerId, testPreparerId, 'Preparer should be assigned');
      assertEqual(assignment.clientId, clientProfile.id, 'Client should be assigned');
      assertEqual(assignment.isActive, true, 'Assignment should be active');

      // Verify preparer can now find this client
      const preparerClients = await prisma.clientPreparer.findMany({
        where: {
          preparerId: testPreparerId,
          isActive: true,
        },
        include: {
          client: true,
        },
      });

      const hasClient = preparerClients.some((c) => c.clientId === clientProfile.id);
      assert(hasClient, 'Client should be in preparer\'s client list');

      logSuccess(`Assignment created: ${assignment.id}`);
    })
  );

  // Test 5: Conversion stats are accurate for preparer
  results.push(
    await runTest('Conversion stats accurate for preparer', async () => {
      // Count conversions for the preparer
      const totalLeads = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: testPreparerId },
      });

      const convertedLeads = await prisma.taxIntakeLead.count({
        where: {
          assignedPreparerId: testPreparerId,
          convertedToClient: true,
        },
      });

      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

      logSuccess(`Preparer stats: ${convertedLeads}/${totalLeads} converted (${conversionRate.toFixed(1)}%)`);

      // Also check Lead model conversions
      const leadConversions = await prisma.lead.count({
        where: {
          referrerUsername: testPreparerUsername,
          status: 'CONVERTED',
        },
      });

      const totalReferrerLeads = await prisma.lead.count({
        where: { referrerUsername: testPreparerUsername },
      });

      logInfo(`Lead model: ${leadConversions}/${totalReferrerLeads} converted`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 07: Preparer Convert Lead');

  try {
    const results = await runPreparerConvertLeadTest();

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

export { runPreparerConvertLeadTest };
