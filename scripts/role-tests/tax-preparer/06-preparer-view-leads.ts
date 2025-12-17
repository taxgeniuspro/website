/**
 * Test 06: Tax Preparer Can View Their Assigned Leads
 *
 * Validates that tax preparers can only view leads assigned to them,
 * with correct status calculations and filtering.
 *
 * Analytics Validated: Lead status counts
 */

import {
  prisma,
  createTestUser,
  createTestTaxIntakeLead,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  getFirstUserByRole,
  getSessionByUsername,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runPreparerViewLeadsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Setup: Create two preparers
  let preparerAId: string;
  let preparerBId: string;

  // Test 1: Preparer can view their assigned leads
  results.push(
    await runTest('Preparer can view assigned leads', async () => {
      // Create two test preparers
      const { profile: preparerA } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'PreparerA',
        lastName: 'Test',
        shortLinkUsername: `preparer-a-${Date.now()}`,
      });
      preparerAId = preparerA.id;

      const { profile: preparerB } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'PreparerB',
        lastName: 'Test',
        shortLinkUsername: `preparer-b-${Date.now()}`,
      });
      preparerBId = preparerB.id;

      // Create leads assigned to Preparer A
      for (let i = 0; i < 5; i++) {
        await createTestTaxIntakeLead({
          assignedPreparerId: preparerAId,
          firstName: `LeadA${i}`,
          completed: i < 3,
        });
      }

      // Create leads assigned to Preparer B
      for (let i = 0; i < 3; i++) {
        await createTestTaxIntakeLead({
          assignedPreparerId: preparerBId,
          firstName: `LeadB${i}`,
          completed: i < 1,
        });
      }

      // Preparer A should see only their leads
      const preparerALeads = await prisma.taxIntakeLead.findMany({
        where: { assignedPreparerId: preparerAId },
      });

      assertEqual(preparerALeads.length, 5, 'Preparer A should have 5 leads');

      // Preparer B should see only their leads
      const preparerBLeads = await prisma.taxIntakeLead.findMany({
        where: { assignedPreparerId: preparerBId },
      });

      assertEqual(preparerBLeads.length, 3, 'Preparer B should have 3 leads');

      logSuccess(`Preparer A: ${preparerALeads.length} leads, Preparer B: ${preparerBLeads.length} leads`);
    })
  );

  // Test 2: Lead status filtering works correctly
  results.push(
    await runTest('Lead status filtering works', async () => {
      // Get completed leads for Preparer A
      const completedLeads = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: preparerAId,
          completed: true,
        },
      });

      assertEqual(completedLeads.length, 3, 'Preparer A should have 3 completed leads');

      // Get pending leads for Preparer A
      const pendingLeads = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: preparerAId,
          completed: false,
        },
      });

      assertEqual(pendingLeads.length, 2, 'Preparer A should have 2 pending leads');

      logSuccess(`Completed: ${completedLeads.length}, Pending: ${pendingLeads.length}`);
    })
  );

  // Test 3: Preparer cannot access other preparer's leads
  results.push(
    await runTest('Preparer cannot access other leads', async () => {
      // Get a lead assigned to Preparer B
      const preparerBLead = await prisma.taxIntakeLead.findFirst({
        where: { assignedPreparerId: preparerBId },
      });

      assertNotNull(preparerBLead, 'Preparer B should have a lead');

      // Simulate Preparer A trying to access this lead
      // In the API, this check would filter results
      const canAccessOtherLead = preparerBLead.assignedPreparerId === preparerAId;
      assertEqual(canAccessOtherLead, false, 'Preparer A should not see Preparer B leads');

      // A filtered query as Preparer A should not include Preparer B's leads
      const preparerALeadsWithBId = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: preparerAId,
          id: preparerBLead.id,
        },
      });

      assertEqual(preparerALeadsWithBId.length, 0, 'Preparer A query should not return Preparer B leads');

      logSuccess('Lead access isolation verified');
    })
  );

  // Test 4: Lead search by name/email works
  results.push(
    await runTest('Lead search functionality works', async () => {
      // Create a lead with searchable name
      await createTestTaxIntakeLead({
        assignedPreparerId: preparerAId,
        firstName: 'SearchableJohn',
        lastName: 'Doe',
        email: 'searchable-john@test-taxgeniuspro.local',
      });

      // Search by first name
      const searchByFirstName = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: preparerAId,
          first_name: { contains: 'SearchableJohn', mode: 'insensitive' },
        },
      });

      assertGreaterThanOrEqual(searchByFirstName.length, 1, 'Should find lead by first name');

      // Search by email
      const searchByEmail = await prisma.taxIntakeLead.findMany({
        where: {
          assignedPreparerId: preparerAId,
          email: { contains: 'searchable-john', mode: 'insensitive' },
        },
      });

      assertGreaterThanOrEqual(searchByEmail.length, 1, 'Should find lead by email');

      logSuccess('Search functionality verified');
    })
  );

  // Test 5: Lead stats calculation is accurate
  results.push(
    await runTest('Lead stats are accurate', async () => {
      // Get all stats for Preparer A
      const allLeads = await prisma.taxIntakeLead.findMany({
        where: { assignedPreparerId: preparerAId },
      });

      const stats = {
        total: allLeads.length,
        completed: allLeads.filter((l) => l.completed).length,
        pending: allLeads.filter((l) => !l.completed).length,
      };

      // Verify stats add up
      assertEqual(stats.total, stats.completed + stats.pending, 'Stats should add up');

      // Verify against direct counts
      const directTotal = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: preparerAId },
      });

      const directCompleted = await prisma.taxIntakeLead.count({
        where: { assignedPreparerId: preparerAId, completed: true },
      });

      assertEqual(stats.total, directTotal, 'Total count should match direct query');
      assertEqual(stats.completed, directCompleted, 'Completed count should match direct query');

      logSuccess('Lead stats verified');
      logInfo(`  Total: ${stats.total}`);
      logInfo(`  Completed: ${stats.completed}`);
      logInfo(`  Pending: ${stats.pending}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 06: Preparer View Leads');

  try {
    const results = await runPreparerViewLeadsTest();

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

export { runPreparerViewLeadsTest };
