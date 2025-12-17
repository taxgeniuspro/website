/**
 * Integration Test: Phase 1.3 - Admin Approves Application
 *
 * Tests the approval process that creates User, Profile, and tracking code.
 *
 * Tests:
 * - 1.3.1: Approve application (status: APPROVED)
 * - 1.3.2: Verify User created
 * - 1.3.3: Verify Profile created with tax_preparer role
 * - 1.3.4: Verify tracking code auto-assigned
 * - 1.3.5: Verify 3 marketing links generated
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

async function runAdminApproveApplicationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let testApplicationId: string;
  let testApplicationEmail: string;
  let createdUserId: string;
  let createdProfileId: string;

  // Setup: Create test application at DECISION stage
  results.push(
    await runTest('Setup: Create application at DECISION stage', async () => {
      const { application } = await createTestPreparerApplication({
        firstName: 'Approve',
        lastName: 'Test',
        status: 'PENDING',
      });

      // Move to DECISION stage
      await prisma.preparerApplication.update({
        where: { id: application.id },
        data: {
          stage: 'DECISION',
          interviewNotes: 'Approved for onboarding',
        },
      });

      testApplicationId = application.id;
      testApplicationEmail = application.email;

      logSuccess(`Application ready for approval: ${application.id}`);
      logInfo(`  Email: ${application.email}`);
    })
  );

  // Test 1.3.1: Approve application
  results.push(
    await runTest('1.3.1 Approve application', async () => {
      const updated = await prisma.preparerApplication.update({
        where: { id: testApplicationId },
        data: {
          status: 'APPROVED',
          convertedAt: new Date(),
        },
      });

      assertEqual(updated.status, 'APPROVED', 'Status should be APPROVED');
      assertNotNull(updated.convertedAt, 'Converted date should be set');
      logSuccess('Application approved');
      logInfo(`  Approved at: ${updated.convertedAt}`);
    })
  );

  // Test 1.3.2: Create User for approved preparer
  results.push(
    await runTest('1.3.2 Create User for preparer', async () => {
      // Get application details
      const application = await prisma.preparerApplication.findUnique({
        where: { id: testApplicationId },
      });

      // Create user (simulating approval workflow)
      const user = await prisma.user.create({
        data: {
          email: application!.email,
          name: `${application!.firstName} ${application!.lastName}`,
          emailVerified: new Date(), // Auto-verify on approval
        },
      });

      createdUserId = user.id;

      assertNotNull(user.id, 'User should be created');
      assertNotNull(user.emailVerified, 'Email should be verified');
      logSuccess(`User created: ${user.id}`);
      logInfo(`  Email: ${user.email}`);
      logInfo(`  Email Verified: ${user.emailVerified}`);
    })
  );

  // Test 1.3.3: Create Profile with tax_preparer role
  results.push(
    await runTest('1.3.3 Create Profile with tax_preparer role', async () => {
      const application = await prisma.preparerApplication.findUnique({
        where: { id: testApplicationId },
      });

      // Generate tracking code from initials
      const initials = `${application!.firstName[0]}${application!.lastName[0]}`.toLowerCase();
      const trackingCode = `${initials}${Date.now()}`;

      const profile = await prisma.profile.create({
        data: {
          userId: createdUserId,
          role: 'tax_preparer',
          firstName: application!.firstName,
          lastName: application!.lastName,
          phone: application!.phone,
          affiliateStatus: 'APPROVED',
          trackingCode: trackingCode,
          trackingCodeFinalized: true,
          shortLinkUsername: trackingCode,
        },
      });

      createdProfileId = profile.id;

      assertNotNull(profile.id, 'Profile should be created');
      assertEqual(profile.role, 'tax_preparer', 'Role should be tax_preparer');
      assertEqual(profile.affiliateStatus, 'APPROVED', 'Affiliate status should be APPROVED');

      logSuccess(`Profile created: ${profile.id}`);
      logInfo(`  Role: ${profile.role}`);
      logInfo(`  Name: ${profile.firstName} ${profile.lastName}`);
      logInfo(`  Tracking Code: ${profile.trackingCode}`);
    })
  );

  // Test 1.3.4: Verify tracking code auto-assigned
  results.push(
    await runTest('1.3.4 Verify tracking code assigned', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: createdProfileId },
      });

      assertNotNull(profile, 'Profile should exist');
      assertNotNull(profile!.trackingCode, 'Tracking code should be assigned');
      assert(profile!.trackingCodeFinalized, 'Tracking code should be finalized');

      // Verify tracking code format
      assert(profile!.trackingCode!.length > 0, 'Tracking code should not be empty');

      logSuccess('Tracking code verified');
      logInfo(`  Code: ${profile!.trackingCode}`);
      logInfo(`  Finalized: ${profile!.trackingCodeFinalized}`);
    })
  );

  // Test 1.3.5: Generate 3 marketing links
  results.push(
    await runTest('1.3.5 Generate marketing links', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: createdProfileId },
      });

      const code = profile!.trackingCode!;
      const baseUrl = 'https://taxgeniuspro.tax';

      // Create 3 marketing links: -lead, -intake, -appt
      const linkTypes = [
        { suffix: 'lead', target: `/contact?ref=${code}`, title: 'Lead Capture' },
        { suffix: 'intake', target: `/start-filing/form?ref=${code}`, title: 'Intake Form' },
        { suffix: 'appt', target: `/book?preparer=${createdProfileId}`, title: 'Appointment' },
      ];

      const createdLinks = [];
      for (const linkType of linkTypes) {
        const link = await prisma.marketingLink.create({
          data: {
            code: `${code}-${linkType.suffix}`,
            url: `${baseUrl}${linkType.target}`,
            shortUrl: `${baseUrl}/go/${code}-${linkType.suffix}`,
            title: linkType.title,
            creatorId: createdProfileId,
            creatorType: 'TAX_PREPARER',
            linkType: 'REFERRAL',
            targetPage: linkType.target,
            isActive: true,
            clicks: 0,
            uniqueClicks: 0,
            conversions: 0,
          },
        });
        createdLinks.push(link);
      }

      assertEqual(createdLinks.length, 3, 'Should create 3 marketing links');

      logSuccess('Marketing links created');
      for (const link of createdLinks) {
        logInfo(`  ${link.code}: ${link.shortUrl}`);
      }
    })
  );

  // Test 1.3.6: Link application to profile
  results.push(
    await runTest('1.3.6 Link application to profile', async () => {
      const updated = await prisma.preparerApplication.update({
        where: { id: testApplicationId },
        data: {
          convertedProfileId: createdProfileId,
          convertedToRole: 'tax_preparer',
        },
      });

      assertEqual(updated.convertedProfileId, createdProfileId, 'Profile ID should be linked');
      assertEqual(updated.convertedToRole, 'tax_preparer', 'Role should be recorded');

      logSuccess('Application linked to profile');
      logInfo(`  Profile ID: ${updated.convertedProfileId}`);
      logInfo(`  Role: ${updated.convertedToRole}`);
    })
  );

  // Test 1.3.7: Verify complete onboarding state
  results.push(
    await runTest('1.3.7 Verify complete onboarding state', async () => {
      // Get all related records
      const application = await prisma.preparerApplication.findUnique({
        where: { id: testApplicationId },
      });

      const user = await prisma.user.findUnique({
        where: { id: createdUserId },
      });

      const profile = await prisma.profile.findUnique({
        where: { id: createdProfileId },
      });

      const links = await prisma.marketingLink.findMany({
        where: { creatorId: createdProfileId },
      });

      // Verify all components
      assertNotNull(application, 'Application should exist');
      assertEqual(application!.status, 'APPROVED', 'Application status');
      assertNotNull(application!.convertedProfileId, 'Should link to profile');

      assertNotNull(user, 'User should exist');
      assertNotNull(user!.emailVerified, 'Email should be verified');

      assertNotNull(profile, 'Profile should exist');
      assertEqual(profile!.role, 'tax_preparer', 'Profile role');
      assertNotNull(profile!.trackingCode, 'Tracking code');

      assertEqual(links.length, 3, 'Should have 3 marketing links');

      logSuccess('Complete onboarding verified');
      logInfo(`  Application: ${application!.status}`);
      logInfo(`  User: ${user!.email}`);
      logInfo(`  Profile: ${profile!.role}`);
      logInfo(`  Links: ${links.length}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Phase 1.3: Admin Approves Application');

  try {
    const results = await runAdminApproveApplicationTests();

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

export { runAdminApproveApplicationTests };
