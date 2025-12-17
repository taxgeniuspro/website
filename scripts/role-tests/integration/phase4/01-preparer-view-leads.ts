/**
 * Integration Test: Phase 4.1 - Preparer Views Assigned Leads
 *
 * Tests preparer's ability to view their assigned leads.
 * Note: TaxIntakeLead uses boolean flags (completed, convertedToClient, unqualified)
 * and snake_case timestamps (created_at, updated_at).
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

async function runPreparerViewLeadsTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testPreparerId: string;
  let testLeadIds: string[] = [];

  // Setup
  results.push(
    await runTest('Setup: Create preparer with assigned leads', async () => {
      const { profile } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'ViewLeads',
        lastName: 'Preparer',
        shortLinkUsername: `vlp${Date.now()}`,
      });
      testPreparerId = profile.id;

      // Create 5 leads assigned to this preparer
      // Some with lastContactedAt set (simulating "contacted" status)
      for (let i = 0; i < 5; i++) {
        const { intakeLead } = await createTestTaxIntakeLead({
          firstName: `ViewLead${i}`,
          lastName: `Test${Date.now()}`,
          assignedPreparerId: testPreparerId,
        });
        testLeadIds.push(intakeLead.id);
      }

      // Mark 2 leads as "contacted" by setting lastContactedAt
      for (let i = 3; i < 5; i++) {
        await prisma.taxIntakeLead.update({
          where: { id: testLeadIds[i] },
          data: {
            lastContactedAt: new Date(),
            contactMethod: 'CALL',
          },
        });
      }

      logSuccess(`Created preparer with ${testLeadIds.length} leads`);
    })
  );

  // Test 4.1.1: Query assigned leads
  results.push(
    await runTest('4.1.1 Query preparer assigned leads', async () => {
      const leads = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: testPreparerId,
        },
        orderBy: { created_at: 'desc' },
      });

      assertEqual(leads.length, 5, 'Should find 5 assigned leads');
      logSuccess(`Found ${leads.length} leads`);
    })
  );

  // Test 4.1.2: Filter by contact status (contacted vs not contacted)
  results.push(
    await runTest('4.1.2 Filter leads by contact status', async () => {
      // "NEW" = not yet contacted (lastContactedAt is null)
      const newLeads = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: testPreparerId,
          lastContactedAt: null,
        },
      });

      assertEqual(newLeads.length, 3, 'Should find 3 NEW (uncontacted) leads');

      // "CONTACTED" = has been contacted
      const contactedLeads = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: testPreparerId,
          lastContactedAt: { not: null },
        },
      });

      assertEqual(contactedLeads.length, 2, 'Should find 2 CONTACTED leads');
      logSuccess('Contact status filter works');
    })
  );

  // Test 4.1.3: View lead details
  results.push(
    await runTest('4.1.3 View lead details', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadIds[0] },
      });

      assertNotNull(lead, 'Lead should exist');
      assertNotNull(lead!.first_name, 'First name should exist');
      assertNotNull(lead!.email, 'Email should exist');
      assertEqual(lead!.assignedPreparerId, testPreparerId, 'Should be assigned to test preparer');

      logSuccess('Lead details accessible');
      logInfo(`  Name: ${lead!.first_name} ${lead!.last_name}`);
      logInfo(`  Email: ${lead!.email}`);
      logInfo(`  Contacted: ${lead!.lastContactedAt ? 'Yes' : 'No'}`);
    })
  );

  // Test 4.1.4: Pagination
  results.push(
    await runTest('4.1.4 Paginate leads', async () => {
      const page1 = await prisma.taxIntakeLead.findMany({
        where: { assignedPreparerId: testPreparerId },
        take: 2,
        skip: 0,
        orderBy: { created_at: 'desc' },
      });

      const page2 = await prisma.taxIntakeLead.findMany({
        where: { assignedPreparerId: testPreparerId },
        take: 2,
        skip: 2,
        orderBy: { created_at: 'desc' },
      });

      assertEqual(page1.length, 2, 'Page 1 should have 2 leads');
      assertEqual(page2.length, 2, 'Page 2 should have 2 leads');
      assert(page1[0].id !== page2[0].id, 'Pages should have different leads');

      logSuccess('Pagination works');
    })
  );

  // Test 4.1.5: Count leads by completion status
  results.push(
    await runTest('4.1.5 Count leads by completion status', async () => {
      const total = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: testPreparerId },
      });

      const completed = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: testPreparerId, completed: true },
      });

      const converted = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: testPreparerId, convertedToClient: true },
      });

      assert(total > 0, 'Should have leads');
      logSuccess('Lead counts');
      logInfo(`  Total: ${total}`);
      logInfo(`  Completed: ${completed}`);
      logInfo(`  Converted: ${converted}`);
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 4.1: Preparer Views Assigned Leads');

  try {
    const results = await runPreparerViewLeadsTests();
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
export { runPreparerViewLeadsTests };
