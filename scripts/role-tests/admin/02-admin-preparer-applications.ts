/**
 * Test 02: Admin Can Approve/Reject Preparer Applications
 *
 * Validates that administrators can view pending preparer applications
 * and approve or reject them.
 *
 * Analytics Validated: getAllPreparersLeadPerformance()
 */

import {
  prisma,
  createTestPreparerApplication,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  getFirstUserByRole,
  getAllPreparersLeadPerformance,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAdminPreparerApplicationsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const createdApplicationIds: string[] = [];

  // Test 1: Admin can view all pending applications
  results.push(
    await runTest('Admin can view pending applications', async () => {
      const adminSession = await getFirstUserByRole('admin');
      assertNotNull(adminSession, 'Admin user should exist');

      // Create test applications
      const { application: app1 } = await createTestPreparerApplication({ status: 'PENDING' });
      const { application: app2 } = await createTestPreparerApplication({ status: 'PENDING' });
      createdApplicationIds.push(app1.id, app2.id);

      // Query pending applications
      const pendingApps = await prisma.preparerApplication.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      assertGreaterThanOrEqual(pendingApps.length, 2, 'Should have at least 2 pending applications');

      // Verify application fields
      for (const app of pendingApps) {
        assertNotNull(app.firstName, 'Application should have first name');
        assertNotNull(app.lastName, 'Application should have last name');
        assertNotNull(app.email, 'Application should have email');
        assertEqual(app.status, 'PENDING', 'Status should be PENDING');
      }

      logSuccess(`Found ${pendingApps.length} pending applications`);
    })
  );

  // Test 2: Admin can approve an application
  results.push(
    await runTest('Admin can approve an application', async () => {
      // Create a new application to approve
      const { application } = await createTestPreparerApplication({
        status: 'PENDING',
        firstName: 'ApproveTest',
        lastName: 'User',
      });
      createdApplicationIds.push(application.id);

      // Approve the application
      const approvedApp = await prisma.preparerApplication.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          convertedAt: new Date(),
          notes: 'Approved by test',
        },
      });

      assertEqual(approvedApp.status, 'APPROVED', 'Application status should be APPROVED');
      assertNotNull(approvedApp.convertedAt, 'Converted date should be set');

      logSuccess(`Application ${application.id} approved successfully`);
    })
  );

  // Test 3: Admin can reject an application
  results.push(
    await runTest('Admin can reject an application', async () => {
      // Create a new application to reject
      const { application } = await createTestPreparerApplication({
        status: 'PENDING',
        firstName: 'RejectTest',
        lastName: 'User',
      });
      createdApplicationIds.push(application.id);

      // Reject the application
      const rejectedApp = await prisma.preparerApplication.update({
        where: { id: application.id },
        data: {
          status: 'REJECTED',
          notes: 'Rejected by test - insufficient experience',
        },
      });

      assertEqual(rejectedApp.status, 'REJECTED', 'Application status should be REJECTED');
      assertNotNull(rejectedApp.notes, 'Notes should be set');

      logSuccess(`Application ${application.id} rejected successfully`);
    })
  );

  // Test 4: Approved application can create new preparer profile
  results.push(
    await runTest('Approved application creates preparer profile', async () => {
      // Create and approve an application
      const testEmail = `approved-preparer-${Date.now()}@test-taxgeniuspro.local`;
      const { application } = await createTestPreparerApplication({
        status: 'PENDING',
        firstName: 'NewPreparer',
        lastName: 'FromApp',
        email: testEmail,
      });
      createdApplicationIds.push(application.id);

      // Simulate approval flow - create user and profile
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: `${application.firstName} ${application.lastName}`,
        },
      });

      const profile = await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'tax_preparer',
          firstName: application.firstName,
          lastName: application.lastName,
        },
      });

      // Update application with profile reference
      await prisma.preparerApplication.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          convertedProfileId: profile.id,
          convertedAt: new Date(),
          convertedToRole: 'tax_preparer',
        },
      });

      // Verify profile was created
      const createdProfile = await prisma.profile.findUnique({
        where: { id: profile.id },
        include: { user: true },
      });

      assertNotNull(createdProfile, 'Profile should be created');
      assertEqual(createdProfile.role, 'tax_preparer', 'Role should be tax_preparer');
      assertEqual(createdProfile.user.email, testEmail, 'Email should match');

      logSuccess(`New preparer profile created: ${profile.id}`);
    })
  );

  // Test 5: Analytics updated after preparer approval
  results.push(
    await runTest('Analytics reflects new preparer', async () => {
      // Get preparer count before
      const beforePerformance = await getAllPreparersLeadPerformance('all');
      const beforeCount = beforePerformance.length;

      // Create and approve a new preparer
      const testEmail = `analytics-preparer-${Date.now()}@test-taxgeniuspro.local`;
      const { application } = await createTestPreparerApplication({
        status: 'PENDING',
        firstName: 'Analytics',
        lastName: 'Preparer',
        email: testEmail,
      });
      createdApplicationIds.push(application.id);

      // Create user and profile
      const user = await prisma.user.create({
        data: {
          email: testEmail,
          name: 'Analytics Preparer',
        },
      });

      const shortLinkUsername = `test-analytics-${Date.now()}`;
      const profile = await prisma.profile.create({
        data: {
          userId: user.id,
          role: 'tax_preparer',
          firstName: application.firstName,
          lastName: application.lastName,
          shortLinkUsername,
        },
      });

      await prisma.preparerApplication.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          convertedProfileId: profile.id,
        },
      });

      // Get preparer count after
      const afterPerformance = await getAllPreparersLeadPerformance('all');
      const afterCount = afterPerformance.length;

      // Verify count increased
      assertEqual(afterCount, beforeCount + 1, 'Preparer count should increase by 1');

      // Verify new preparer is in list
      const newPreparer = afterPerformance.find((p) => p.username === shortLinkUsername);
      assertNotNull(newPreparer, 'New preparer should be in analytics');
      assertEqual(newPreparer.leads, 0, 'New preparer should have 0 leads');

      logSuccess(`Analytics updated: ${beforeCount} -> ${afterCount} preparers`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 02: Admin Preparer Applications');

  try {
    const results = await runAdminPreparerApplicationsTest();

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

export { runAdminPreparerApplicationsTest };
