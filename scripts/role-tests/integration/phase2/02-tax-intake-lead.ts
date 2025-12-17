/**
 * Integration Test: Phase 2.2 - Tax Intake Form Lead
 *
 * Tests TaxIntakeLead creation with preparer assignment.
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
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

async function runTaxIntakeLeadTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testPreparerId: string;
  let testTrackingCode: string;
  let testIntakeLeadId: string;
  let testContactId: string;

  // Setup
  results.push(
    await runTest('Setup: Create preparer', async () => {
      const { profile } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Intake',
        lastName: 'Preparer',
        shortLinkUsername: `ip${Date.now()}`,
      });
      testPreparerId = profile.id;
      testTrackingCode = profile.customTrackingCode || '';
      logSuccess(`Preparer: ${testPreparerId}`);
    })
  );

  // Test 2.2.1: Create TaxIntakeLead with ref parameter
  results.push(
    await runTest('2.2.1 Create TaxIntakeLead with attribution', async () => {
      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'IntakeTest',
        lastName: `Client${Date.now()}`,
        referrerUsername: testTrackingCode,
        assignedPreparerId: testPreparerId,
      });

      testIntakeLeadId = intakeLead.id;
      assertNotNull(intakeLead.id, 'Intake lead should be created');
      assertEqual(intakeLead.referrerUsername, testTrackingCode, 'Referrer should match');
      assertEqual(intakeLead.assignedPreparerId, testPreparerId, 'Assigned preparer should match');

      logSuccess(`Intake lead created: ${intakeLead.id}`);
      logInfo(`  Referrer: ${intakeLead.referrerUsername}`);
      logInfo(`  Assigned to: ${intakeLead.assignedPreparerId}`);
    })
  );

  // Test 2.2.2: Verify preparer assignment from referrer
  results.push(
    await runTest('2.2.2 Preparer assignment from referrer', async () => {
      const intakeLead = await prisma.taxIntakeLead.findUnique({
        where: { id: testIntakeLeadId },
      });

      assertNotNull(intakeLead, 'Intake lead should exist');
      assertEqual(intakeLead!.assignedPreparerId, testPreparerId, 'Preparer should be assigned');

      // Verify preparer exists and has correct role
      const preparer = await prisma.profile.findUnique({
        where: { id: testPreparerId },
      });
      assertEqual(preparer!.role, 'tax_preparer', 'Should be tax preparer');

      logSuccess('Preparer assignment verified');
    })
  );

  // Test 2.2.3: Upsert CRMContact from intake lead
  results.push(
    await runTest('2.2.3 CRMContact upserted', async () => {
      const intakeLead = await prisma.taxIntakeLead.findUnique({
        where: { id: testIntakeLeadId },
      });

      // Create/update CRMContact (as intake API would)
      const contact = await prisma.cRMContact.upsert({
        where: { email: intakeLead!.email },
        update: {
          firstName: intakeLead!.first_name,
          lastName: intakeLead!.last_name,
          phone: intakeLead!.phone,
          referrerUsername: intakeLead!.referrerUsername,
        },
        create: {
          firstName: intakeLead!.first_name,
          lastName: intakeLead!.last_name || '',
          email: intakeLead!.email,
          phone: intakeLead!.phone,
          contactType: 'LEAD',
          source: 'TAX_INTAKE',
          referrerUsername: intakeLead!.referrerUsername,
        },
      });

      testContactId = contact.id;
      assertNotNull(contact.id, 'CRMContact should be created');
      assertEqual(contact.referrerUsername, testTrackingCode, 'Referrer should be preserved');

      logSuccess(`CRMContact upserted: ${contact.id}`);
    })
  );

  // Test 2.2.4: Log CRM interaction
  results.push(
    await runTest('2.2.4 CRM interaction logged', async () => {
      assertNotNull(testContactId, 'Contact ID from previous test');

      const interaction = await prisma.cRMInteraction.create({
        data: {
          contactId: testContactId,
          type: 'NOTE',
          subject: 'Tax Intake Started',
          body: 'Tax intake form submitted via web',
        },
      });

      assertNotNull(interaction.id, 'Interaction should be logged');
      logSuccess(`Interaction logged: ${interaction.id}`);
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 2.2: Tax Intake Form Lead');

  try {
    const results = await runTaxIntakeLeadTests();
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
export { runTaxIntakeLeadTests };
