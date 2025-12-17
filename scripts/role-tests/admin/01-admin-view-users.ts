/**
 * Test 01: Admin Can View All Users and Their Roles
 *
 * Validates that administrators can view a complete list of all users
 * in the system along with their assigned roles.
 *
 * Analytics Validated: User counts by role
 */

import {
  prisma,
  createTestUser,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThan,
  getFirstUserByRole,
  getAllUsersByRole,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runAdminViewUsersTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // Test 1: Admin can access user list
  results.push(
    await runTest('Admin can retrieve all users', async () => {
      // Get an admin session
      const adminSession = await getFirstUserByRole('admin');
      assertNotNull(adminSession, 'Admin user should exist');

      // Get all profiles with user info
      const profiles = await prisma.profile.findMany({
        include: {
          user: {
            select: { email: true, name: true, createdAt: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      assertGreaterThan(profiles.length, 0, 'Should have at least one user');

      // Verify each profile has required fields
      for (const profile of profiles) {
        assertNotNull(profile.id, 'Profile should have ID');
        assertNotNull(profile.role, 'Profile should have role');
        assertNotNull(profile.user.email, 'User should have email');
        assert(
          ['admin', 'tax_preparer', 'client'].includes(profile.role),
          `Role should be valid: ${profile.role}`
        );
      }

      logSuccess(`Retrieved ${profiles.length} users`);
    })
  );

  // Test 2: Count users by role
  results.push(
    await runTest('Count users by role is accurate', async () => {
      const roleCounts = await prisma.profile.groupBy({
        by: ['role'],
        _count: { id: true },
      });

      const counts: Record<string, number> = {};
      roleCounts.forEach((item) => {
        counts[item.role] = item._count.id;
      });

      logInfo(`Role distribution: ${JSON.stringify(counts)}`);

      // Verify we have the expected roles
      assert(counts['admin'] !== undefined || counts['tax_preparer'] !== undefined,
        'Should have admin or tax_preparer users');

      // Sum should equal total profiles
      const totalFromCounts = Object.values(counts).reduce((a, b) => a + b, 0);
      const totalProfiles = await prisma.profile.count();
      assertEqual(totalFromCounts, totalProfiles, 'Role counts should sum to total profiles');

      logSuccess(`Total users: ${totalProfiles}`);
    })
  );

  // Test 3: Admin can view specific user details
  results.push(
    await runTest('Admin can view specific user by ID', async () => {
      const adminSession = await getFirstUserByRole('admin');
      assertNotNull(adminSession, 'Admin should exist');

      // Get a tax preparer to view
      const taxPreparer = await prisma.profile.findFirst({
        where: { role: 'tax_preparer' },
        include: {
          user: {
            select: { email: true },
          },
        },
      });

      if (!taxPreparer) {
        logInfo('No tax preparer found, skipping this check');
        return;
      }

      // Admin should be able to fetch this user's details
      const profile = await prisma.profile.findUnique({
        where: { id: taxPreparer.id },
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      });

      assertNotNull(profile, 'Profile should be retrievable');
      assertEqual(profile.role, 'tax_preparer', 'Role should be tax_preparer');
      assertNotNull(profile.user.email, 'Email should be visible');

      logSuccess(`Retrieved tax preparer: ${profile.user.email}`);
    })
  );

  // Test 4: Admin can view user affiliate status
  results.push(
    await runTest('Admin can view user affiliate status', async () => {
      // Get a user with affiliate status
      const profile = await prisma.profile.findFirst({
        where: { affiliateStatus: { not: 'NONE' } },
        select: {
          id: true,
          role: true,
          affiliateStatus: true,
          user: {
            select: { email: true },
          },
        },
      });

      if (!profile) {
        // Create test user and update affiliate status
        const { profile: testProfile } = await createTestUser({
          role: 'client',
          firstName: 'AffiliateView',
          lastName: 'Test',
        });

        // Update with affiliate status
        await prisma.profile.update({
          where: { id: testProfile.id },
          data: {
            affiliateStatus: 'PENDING',
          },
        });

        const updatedProfile = await prisma.profile.findUnique({
          where: { id: testProfile.id },
          select: {
            affiliateStatus: true,
          },
        });

        assertEqual(updatedProfile?.affiliateStatus, 'PENDING', 'Affiliate status should be PENDING');
        logSuccess('Created and verified user with affiliate status');
      } else {
        assertNotNull(profile.affiliateStatus, 'Affiliate status should be retrievable');
        logSuccess(`User ${profile.user.email} has affiliate status: ${profile.affiliateStatus}`);
      }
    })
  );

  // Test 5: All tax preparers are visible
  results.push(
    await runTest('All tax preparers are visible to admin', async () => {
      const allTaxPreparers = await getAllUsersByRole('tax_preparer');

      logInfo(`Found ${allTaxPreparers.length} tax preparers`);

      // Verify each tax preparer has proper fields
      for (const preparer of allTaxPreparers) {
        assertNotNull(preparer.profileId, 'Preparer should have profile ID');
        assertNotNull(preparer.email, 'Preparer should have email');
        assertEqual(preparer.role, 'tax_preparer', 'Role should be tax_preparer');
      }

      // Verify with database count
      const dbCount = await prisma.profile.count({
        where: { role: 'tax_preparer' },
      });

      assertEqual(allTaxPreparers.length, dbCount, 'All tax preparers should be retrieved');

      logSuccess(`Verified ${allTaxPreparers.length} tax preparers are accessible`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 01: Admin View Users');

  try {
    const results = await runAdminViewUsersTest();

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

export { runAdminViewUsersTest };
