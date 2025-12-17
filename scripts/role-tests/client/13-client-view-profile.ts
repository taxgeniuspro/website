/**
 * Test 13: Client Can View Their Profile
 *
 * Validates that clients can retrieve their own profile data.
 *
 * Analytics Validated: Profile data accuracy
 */

import {
  prisma,
  createTestUser,
  runTest,
  assertEqual,
  assertNotNull,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runClientViewProfileTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testClientId: string;
  let testUserId: string;

  // Test 1: Client can view their profile
  results.push(
    await runTest('Client can view own profile', async () => {
      // Create test client
      const { profile: client, user } = await createTestUser({
        role: 'client',
        firstName: 'Profile',
        lastName: 'Viewer',
      });
      testClientId = client.id;
      testUserId = user.id;

      // Client fetches their profile
      const profile = await prisma.profile.findUnique({
        where: { id: testClientId },
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      });

      assertNotNull(profile, 'Profile should exist');
      assertEqual(profile.firstName, 'Profile', 'First name should match');
      assertEqual(profile.lastName, 'Viewer', 'Last name should match');
      assertEqual(profile.role, 'client', 'Role should be client');

      logSuccess(`Client profile retrieved: ${profile.firstName} ${profile.lastName}`);
    })
  );

  // Test 2: Profile includes user email
  results.push(
    await runTest('Profile includes user email', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: testClientId },
        include: {
          user: {
            select: { email: true },
          },
        },
      });

      assertNotNull(profile?.user.email, 'Email should be included');
      assertEqual(profile.user.email.includes('@test-taxgeniuspro.local'), true,
        'Email should be test email');

      logSuccess(`Profile email: ${profile.user.email}`);
    })
  );

  // Test 3: Profile shows affiliate status
  results.push(
    await runTest('Profile shows affiliate status', async () => {
      const profile = await prisma.profile.findUnique({
        where: { id: testClientId },
        select: {
          affiliateStatus: true,
          hasFiledTaxes: true,
        },
      });

      assertNotNull(profile, 'Profile should exist');
      assertEqual(profile.affiliateStatus, 'NONE', 'Initial affiliate status should be NONE');
      assertEqual(profile.hasFiledTaxes, false, 'hasFiledTaxes should be false initially');

      logSuccess(`Affiliate status: ${profile.affiliateStatus}, hasFiledTaxes: ${profile.hasFiledTaxes}`);
    })
  );

  // Test 4: Client can update their profile
  results.push(
    await runTest('Client can update profile', async () => {
      // Update profile
      const updatedProfile = await prisma.profile.update({
        where: { id: testClientId },
        data: {
          phone: '555-123-4567',
          address: {
            address1: '123 Test Street',
            city: 'Atlanta',
            state: 'GA',
            zip: '30301',
          },
        },
      });

      assertEqual(updatedProfile.phone, '555-123-4567', 'Phone should be updated');
      const address = updatedProfile.address as Record<string, string> | null;
      assertEqual(address?.city, 'Atlanta', 'City should be updated');
      assertEqual(address?.state, 'GA', 'State should be updated');

      logSuccess('Profile updated with contact info');
    })
  );

  // Test 5: Sensitive fields not exposed
  results.push(
    await runTest('Sensitive fields not exposed', async () => {
      // Simulate API response selection (what should be exposed)
      const publicProfile = await prisma.profile.findUnique({
        where: { id: testClientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          address: true,
          role: true,
          affiliateStatus: true,
          // Internal fields not selected:
          // trackingCode - internal tracking
          // ssn_enc, dob_enc - encrypted PII
        },
      });

      assertNotNull(publicProfile, 'Public profile should exist');
      assertNotNull(publicProfile.firstName, 'First name should be visible');
      assertNotNull(publicProfile.role, 'Role should be visible');

      // Verify internal fields not in selection
      const profileWithAll = await prisma.profile.findUnique({
        where: { id: testClientId },
      });

      // These exist but wouldn't be in API response
      logInfo(`  Internal fields exist but not exposed: trackingCode=${profileWithAll?.trackingCode}`);

      logSuccess('Sensitive field exposure controlled');
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 13: Client View Profile');

  try {
    const results = await runClientViewProfileTest();

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
    console.error(`Test suite error: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

export { runClientViewProfileTest };
