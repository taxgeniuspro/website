/**
 * Integration Test: Phase 3.2 - Admin Manual Lead Assignment
 *
 * Tests admin's ability to assign leads to preparers.
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

async function runAdminAssignLeadTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testPreparer1Id: string;
  let testPreparer2Id: string;
  let testLeadId: string;

  // Setup
  results.push(
    await runTest('Setup: Create preparers and unassigned lead', async () => {
      const { profile: preparer1 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Assign',
        lastName: 'Preparer1',
        shortLinkUsername: `ap1${Date.now()}`,
      });
      testPreparer1Id = preparer1.id;

      const { profile: preparer2 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Assign',
        lastName: 'Preparer2',
        shortLinkUsername: `ap2${Date.now()}`,
      });
      testPreparer2Id = preparer2.id;

      const { intakeLead } = await createTestTaxIntakeLead({
        firstName: 'Unassigned',
        lastName: `Lead${Date.now()}`,
        // No assigned preparer
      });
      testLeadId = intakeLead.id;

      logSuccess('Setup complete');
      logInfo(`  Preparer 1: ${testPreparer1Id}`);
      logInfo(`  Preparer 2: ${testPreparer2Id}`);
      logInfo(`  Lead: ${testLeadId}`);
    })
  );

  // Test 3.2.1: Verify lead is unassigned
  results.push(
    await runTest('3.2.1 Lead starts unassigned', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      assertEqual(lead!.assignedPreparerId, null, 'Lead should be unassigned');
      logSuccess('Lead is unassigned');
    })
  );

  // Test 3.2.2: Admin assigns lead to preparer
  results.push(
    await runTest('3.2.2 Admin assigns lead to preparer', async () => {
      // Note: TaxIntakeLead only has assignedPreparerId (string), no assignedAt
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          assignedPreparerId: testPreparer1Id,
        },
      });

      assertEqual(lead.assignedPreparerId, testPreparer1Id, 'Lead assigned to preparer 1');
      logSuccess(`Lead assigned to preparer 1`);
    })
  );

  // Test 3.2.3: Log assignment activity
  results.push(
    await runTest('3.2.3 Log LeadActivity for assignment', async () => {
      // LeadActivity uses activityType enum and title field
      const activity = await prisma.leadActivity.create({
        data: {
          leadId: testLeadId,
          activityType: 'ASSIGNED',
          title: 'Lead assigned to preparer',
          description: `Lead assigned to preparer ${testPreparer1Id}`,
          metadata: {
            previousPreparerId: null,
            newPreparerId: testPreparer1Id,
            assignedBy: 'admin',
          },
          automated: false,
        },
      });

      assertNotNull(activity.id, 'Activity should be logged');
      assertEqual(activity.activityType, 'ASSIGNED', 'Activity type should be ASSIGNED');
      logSuccess(`Activity logged: ${activity.id}`);
    })
  );

  // Test 3.2.4: Reassign lead to different preparer
  results.push(
    await runTest('3.2.4 Reassign lead to different preparer', async () => {
      const lead = await prisma.taxIntakeLead.update({
        where: { id: testLeadId },
        data: {
          assignedPreparerId: testPreparer2Id,
        },
      });

      assertEqual(lead.assignedPreparerId, testPreparer2Id, 'Lead reassigned to preparer 2');

      // Log reassignment - using STATUS_CHANGED since REASSIGNED isn't in the enum
      await prisma.leadActivity.create({
        data: {
          leadId: testLeadId,
          activityType: 'STATUS_CHANGED',
          title: 'Lead reassigned',
          description: `Lead reassigned from preparer 1 to preparer 2`,
          metadata: {
            previousPreparerId: testPreparer1Id,
            newPreparerId: testPreparer2Id,
            reassignedBy: 'admin',
          },
          automated: false,
        },
      });

      logSuccess('Lead reassigned successfully');
    })
  );

  // Test 3.2.5: Verify activity log
  results.push(
    await runTest('3.2.5 Verify activity log', async () => {
      const activities = await prisma.leadActivity.findMany({
        where: { leadId: testLeadId },
        orderBy: { createdAt: 'asc' },
      });

      assertEqual(activities.length, 2, 'Should have 2 activities');
      assertEqual(activities[0].activityType, 'ASSIGNED', 'First activity is assignment');
      assertEqual(activities[1].activityType, 'STATUS_CHANGED', 'Second activity is reassignment');

      logSuccess('Activity log verified');
      activities.forEach((a) => {
        logInfo(`  ${a.activityType}: ${a.title}`);
      });
    })
  );

  // Test 3.2.6: Update CRMContact with assignment
  results.push(
    await runTest('3.2.6 Update CRMContact assignment', async () => {
      const lead = await prisma.taxIntakeLead.findUnique({
        where: { id: testLeadId },
      });

      // Create/update CRMContact with preparer assignment
      const contact = await prisma.cRMContact.upsert({
        where: { email: lead!.email },
        update: {
          assignedPreparerId: testPreparer2Id,
          assignedAt: new Date(),
        },
        create: {
          firstName: lead!.first_name,
          lastName: lead!.last_name || '',
          email: lead!.email,
          phone: lead!.phone,
          contactType: 'LEAD',
          source: 'TAX_INTAKE',
          assignedPreparerId: testPreparer2Id,
          assignedAt: new Date(),
        },
      });

      assertEqual(contact.assignedPreparerId, testPreparer2Id, 'CRMContact assigned');
      logSuccess('CRMContact updated with preparer assignment');
    })
  );

  return results;
}

async function main() {
  logHeader('Phase 3.2: Admin Manual Lead Assignment');

  try {
    const results = await runAdminAssignLeadTests();
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
export { runAdminAssignLeadTests };
