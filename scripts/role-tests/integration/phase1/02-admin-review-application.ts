/**
 * Integration Test: Phase 1.2 - Admin Reviews Application
 *
 * Tests admin workflow for reviewing preparer applications.
 *
 * Tests:
 * - 1.2.1: Query pending applications as admin
 * - 1.2.2: Update stage: NEW → CONTACTED
 * - 1.2.3: Update stage: CONTACTED → INTERVIEWED
 * - 1.2.4: Update stage: INTERVIEWED → DECISION
 * - 1.2.5: Add interview notes
 */

import {
  prisma,
  createTestPreparerApplication,
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

// Stage progression enum (matching Prisma schema)
const STAGES = ['NEW', 'CONTACTED', 'INTERVIEWED', 'DECISION'] as const;
type ApplicationStage = typeof STAGES[number];

async function runAdminReviewApplicationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testApplicationId: string;

  // Setup: Create test applications
  results.push(
    await runTest('Setup: Create test applications', async () => {
      // Create multiple applications for testing
      const { application } = await createTestPreparerApplication({
        firstName: 'Review',
        lastName: 'Test1',
        status: 'PENDING',
      });
      testApplicationId = application.id;

      // Create a few more for query testing
      await createTestPreparerApplication({ firstName: 'Review', lastName: 'Test2', status: 'PENDING' });
      await createTestPreparerApplication({ firstName: 'Review', lastName: 'Test3', status: 'PENDING' });

      assertNotNull(testApplicationId, 'Test application should be created');
      logSuccess(`Created test applications`);
    })
  );

  // Test 1.2.1: Query pending applications as admin
  results.push(
    await runTest('1.2.1 Query pending applications', async () => {
      const pendingApplications = await prisma.preparerApplication.findMany({
        where: {
          status: 'PENDING',
          email: { contains: '@test-taxgeniuspro.local' },
        },
        orderBy: { createdAt: 'desc' },
      });

      assertGreaterThan(pendingApplications.length, 0, 'Should have pending applications');
      logSuccess(`Found ${pendingApplications.length} pending applications`);

      // Verify application data is complete
      const app = pendingApplications[0];
      assertNotNull(app.firstName, 'First name should be present');
      assertNotNull(app.lastName, 'Last name should be present');
      assertNotNull(app.email, 'Email should be present');

      logInfo(`  Sample: ${app.firstName} ${app.lastName} (${app.email})`);
    })
  );

  // Test 1.2.2: Update stage: NEW → CONTACTED
  results.push(
    await runTest('1.2.2 Update stage: NEW → CONTACTED', async () => {
      const updated = await prisma.preparerApplication.update({
        where: { id: testApplicationId },
        data: {
          stage: 'CONTACTED',
        },
      });

      assertEqual(updated.stage, 'CONTACTED', 'Stage should be CONTACTED');
      logSuccess('Stage updated: NEW → CONTACTED');
      logInfo(`  Application: ${updated.firstName} ${updated.lastName}`);
    })
  );

  // Test 1.2.3: Update stage: CONTACTED → INTERVIEWED
  results.push(
    await runTest('1.2.3 Update stage: CONTACTED → INTERVIEWED', async () => {
      const interviewDate = new Date();
      interviewDate.setDate(interviewDate.getDate() + 3); // Schedule for 3 days from now

      const updated = await prisma.preparerApplication.update({
        where: { id: testApplicationId },
        data: {
          stage: 'INTERVIEWED',
          interviewScheduled: interviewDate,
        },
      });

      assertEqual(updated.stage, 'INTERVIEWED', 'Stage should be INTERVIEWED');
      assertNotNull(updated.interviewScheduled, 'Interview date should be set');
      logSuccess('Stage updated: CONTACTED → INTERVIEWED');
      logInfo(`  Interview scheduled: ${updated.interviewScheduled}`);
    })
  );

  // Test 1.2.4: Update stage: INTERVIEWED → DECISION
  results.push(
    await runTest('1.2.4 Update stage: INTERVIEWED → DECISION', async () => {
      const updated = await prisma.preparerApplication.update({
        where: { id: testApplicationId },
        data: {
          stage: 'DECISION',
        },
      });

      assertEqual(updated.stage, 'DECISION', 'Stage should be DECISION');
      logSuccess('Stage updated: INTERVIEWED → DECISION');
      logInfo(`  Application ready for final decision`);
    })
  );

  // Test 1.2.5: Add interview notes
  results.push(
    await runTest('1.2.5 Add interview notes', async () => {
      const notes = 'Excellent candidate. Strong tax preparation background. Recommended for approval.';

      const updated = await prisma.preparerApplication.update({
        where: { id: testApplicationId },
        data: {
          interviewNotes: notes,
        },
      });

      assertEqual(updated.interviewNotes, notes, 'Interview notes should be saved');
      logSuccess('Interview notes added');
      logInfo(`  Notes: ${notes.substring(0, 50)}...`);
    })
  );

  // Test 1.2.6: Verify stage progression tracking
  results.push(
    await runTest('1.2.6 Verify complete application state', async () => {
      const application = await prisma.preparerApplication.findUnique({
        where: { id: testApplicationId },
      });

      assertNotNull(application, 'Application should exist');
      assertEqual(application!.status, 'PENDING', 'Status should still be PENDING');
      assertEqual(application!.stage, 'DECISION', 'Stage should be DECISION');
      assertNotNull(application!.interviewScheduled, 'Interview date should be set');
      assertNotNull(application!.interviewNotes, 'Interview notes should be set');

      logSuccess('Application state verified');
      logInfo(`  Status: ${application!.status}`);
      logInfo(`  Stage: ${application!.stage}`);
      logInfo(`  Interview: ${application!.interviewScheduled}`);
      logInfo(`  Notes: ${(application!.interviewNotes || '').substring(0, 30)}...`);
    })
  );

  // Test 1.2.7: Filter applications by stage
  results.push(
    await runTest('1.2.7 Filter applications by stage', async () => {
      // Get applications at DECISION stage
      const decisionApps = await prisma.preparerApplication.findMany({
        where: {
          stage: 'DECISION',
          email: { contains: '@test-taxgeniuspro.local' },
        },
      });

      assertGreaterThan(decisionApps.length, 0, 'Should have applications at DECISION stage');
      logSuccess(`Found ${decisionApps.length} applications at DECISION stage`);

      // Get applications at other stages
      const otherApps = await prisma.preparerApplication.findMany({
        where: {
          stage: { not: 'DECISION' },
          email: { contains: '@test-taxgeniuspro.local' },
        },
      });

      logInfo(`  Applications at other stages: ${otherApps.length}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Phase 1.2: Admin Reviews Application');

  try {
    const results = await runAdminReviewApplicationTests();

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

export { runAdminReviewApplicationTests };
