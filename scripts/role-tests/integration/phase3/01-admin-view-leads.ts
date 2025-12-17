/**
 * Integration Test: Phase 3.1 - Admin View All Leads
 *
 * Tests admin's ability to view and filter leads from all entry points.
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
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
} from '../../test-utils/index';

async function runAdminViewLeadsTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testPreparerId: string;
  let testLeadIds: string[] = [];

  // Setup: Create preparer and multiple leads
  results.push(
    await runTest('Setup: Create test preparer and leads', async () => {
      const { profile } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'AdminView',
        lastName: 'Preparer',
        shortLinkUsername: `avp${Date.now()}`,
      });
      testPreparerId = profile.id;

      // Create 3 leads - 2 assigned, 1 unassigned
      for (let i = 0; i < 3; i++) {
        const { intakeLead } = await createTestTaxIntakeLead({
          firstName: `AdminLead${i}`,
          lastName: `Test${Date.now()}`,
          assignedPreparerId: i < 2 ? testPreparerId : undefined,
        });
        testLeadIds.push(intakeLead.id);
      }

      logSuccess(`Created ${testLeadIds.length} test leads`);
    })
  );

  // Test 3.1.1: Query all TaxIntakeLeads
  results.push(
    await runTest('3.1.1 Query all TaxIntakeLeads', async () => {
      // Note: TaxIntakeLead.assignedPreparerId is a string field, not a relation
      const leads = await prisma.taxIntakeLead.findMany({
        where: {
          id: { in: testLeadIds },
        },
      });

      assertEqual(leads.length, 3, 'Should find all test leads');
      logSuccess(`Found ${leads.length} leads`);
      leads.forEach((lead) => {
        logInfo(`  - ${lead.first_name} ${lead.last_name} (assigned: ${lead.assignedPreparerId || 'none'})`);
      });
    })
  );

  // Test 3.1.2: Filter by completed status
  results.push(
    await runTest('3.1.2 Filter leads by completed', async () => {
      // Mark one lead as completed
      await prisma.taxIntakeLead.update({
        where: { id: testLeadIds[0] },
        data: { completed: true },
      });

      const completedLeads = await prisma.taxIntakeLead.findMany({
        where: {
          id: { in: testLeadIds },
          completed: true,
        },
      });

      assertEqual(completedLeads.length, 1, 'Should find 1 completed lead');

      const incompleteLeads = await prisma.taxIntakeLead.findMany({
        where: {
          id: { in: testLeadIds },
          completed: false,
        },
      });

      assertEqual(incompleteLeads.length, 2, 'Should find 2 incomplete leads');
      logSuccess('Completed filtering works');
    })
  );

  // Test 3.1.3: Filter by assigned preparer
  results.push(
    await runTest('3.1.3 Filter leads by assigned preparer', async () => {
      const assignedLeads = await prisma.taxIntakeLead.findMany({
        where: {
          id: { in: testLeadIds },
          assignedPreparerId: testPreparerId,
        },
      });

      assertEqual(assignedLeads.length, 2, 'Should find 2 assigned leads');

      const unassignedLeads = await prisma.taxIntakeLead.findMany({
        where: {
          id: { in: testLeadIds },
          assignedPreparerId: null,
        },
      });

      assertEqual(unassignedLeads.length, 1, 'Should find 1 unassigned lead');
      logSuccess('Preparer filtering works');
    })
  );

  // Test 3.1.4: Query with date range
  results.push(
    await runTest('3.1.4 Filter leads by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      // Note: TaxIntakeLead uses snake_case field: created_at
      const recentLeads = await prisma.taxIntakeLead.findMany({
        where: {
          id: { in: testLeadIds },
          created_at: {
            gte: yesterday,
          },
        },
      });

      assertEqual(recentLeads.length, 3, 'Should find all recent leads');
      logSuccess('Date filtering works');
    })
  );

  // Test 3.1.5: Query CRMContacts alongside leads
  results.push(
    await runTest('3.1.5 Query CRMContacts', async () => {
      // Create a CRM contact for one lead
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadIds[0] },
      });

      const contact = await prisma.cRMContact.create({
        data: {
          firstName: lead!.first_name,
          lastName: lead!.last_name || '',
          email: lead!.email,
          phone: lead!.phone,
          contactType: 'LEAD',
          source: 'TAX_INTAKE',
        },
      });

      assertNotNull(contact.id, 'CRMContact should be created');

      // Query contacts
      const contacts = await prisma.cRMContact.findMany({
        where: {
          email: { contains: '@test-taxgeniuspro.local' },
        },
      });

      assertGreaterThan(contacts.length, 0, 'Should find CRM contacts');
      logSuccess(`Found ${contacts.length} CRM contacts`);
    })
  );

  // Test 3.1.6: Aggregate lead statistics
  results.push(
    await runTest('3.1.6 Aggregate lead statistics', async () => {
      // Count different statuses manually
      const total = await prisma.taxIntakeLead.count({
        where: { id: { in: testLeadIds } },
      });

      const converted = await prisma.taxIntakeLead.count({
        where: { id: { in: testLeadIds }, convertedToClient: true },
      });

      const unqualified = await prisma.taxIntakeLead.count({
        where: { id: { in: testLeadIds }, unqualified: true },
      });

      const active = total - converted - unqualified;

      assertEqual(total, 3, 'Should have 3 total leads');
      logSuccess('Lead statistics aggregation works');
      logInfo(`  Total: ${total}`);
      logInfo(`  Active: ${active}`);
      logInfo(`  Converted: ${converted}`);
      logInfo(`  Unqualified: ${unqualified}`);
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 3.1: Admin View All Leads');

  try {
    const results = await runAdminViewLeadsTests();
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
export { runAdminViewLeadsTests };
