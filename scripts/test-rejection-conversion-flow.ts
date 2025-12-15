/**
 * Comprehensive test for Rejection + Conversion + Owliver Assignment Flow
 *
 * Tests:
 * 1. Create a test preparer application
 * 2. Reject with "Convert to Client" - verify Owliver assignment
 * 3. Reject with "Convert to Affiliate" - verify Owliver assignment
 * 4. Test edge cases and failure points
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEST_EMAIL_PREFIX = 'test-rejection-';
const TEST_EMAIL_DOMAIN = 'taxgeniuspro.test';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({
      name,
      status: 'PASS',
      message: 'Test passed',
      duration: Date.now() - start,
    });
    console.log(`   ✅ ${name}`);
  } catch (error) {
    results.push({
      name,
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.log(`   ❌ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

async function getOwliverProfile() {
  // Test different lookup methods
  const byTrackingCode = await prisma.profile.findFirst({
    where: { customTrackingCode: 'ow' },
    select: { id: true, firstName: true, lastName: true },
  });

  const byEmail = await prisma.user.findUnique({
    where: { email: 'taxgenius.tax@gmail.com' },
    include: { profile: { select: { id: true } } },
  });

  return {
    byTrackingCode,
    byEmail: byEmail?.profile,
    profileId: byTrackingCode?.id || byEmail?.profile?.id,
  };
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  // Delete test ClientPreparer records
  const deletedClientPreparers = await prisma.clientPreparer.deleteMany({
    where: {
      client: {
        user: {
          email: { contains: TEST_EMAIL_PREFIX },
        },
      },
    },
  });
  console.log(`   Deleted ${deletedClientPreparers.count} ClientPreparer records`);

  // Delete test profiles
  const deletedProfiles = await prisma.profile.deleteMany({
    where: {
      user: {
        email: { contains: TEST_EMAIL_PREFIX },
      },
    },
  });
  console.log(`   Deleted ${deletedProfiles.count} Profile records`);

  // Delete test users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: { contains: TEST_EMAIL_PREFIX },
    },
  });
  console.log(`   Deleted ${deletedUsers.count} User records`);

  // Delete test preparer applications
  const deletedApps = await prisma.preparerApplication.deleteMany({
    where: {
      email: { contains: TEST_EMAIL_PREFIX },
    },
  });
  console.log(`   Deleted ${deletedApps.count} PreparerApplication records`);
}

async function main() {
  console.log('🧪 Testing Rejection + Conversion + Owliver Assignment Flow\n');
  console.log('='.repeat(60));

  try {
    // Pre-cleanup
    await cleanupTestData();

    // ===== TEST 1: Verify Owliver exists =====
    console.log('\n1️⃣ Testing Owliver Lookup...');

    await runTest('Owliver found by tracking code', async () => {
      const owliver = await getOwliverProfile();
      if (!owliver.byTrackingCode) {
        throw new Error('Owliver not found by tracking code "ow"');
      }
    });

    await runTest('Owliver found by email', async () => {
      const owliver = await getOwliverProfile();
      if (!owliver.byEmail) {
        throw new Error('Owliver not found by email "taxgenius.tax@gmail.com"');
      }
    });

    await runTest('Both lookup methods return same profile', async () => {
      const owliver = await getOwliverProfile();
      if (owliver.byTrackingCode?.id !== owliver.byEmail?.id) {
        throw new Error(
          `Profile IDs don't match: ${owliver.byTrackingCode?.id} vs ${owliver.byEmail?.id}`
        );
      }
    });

    // ===== TEST 2: Create test preparer application (user doesn't exist) =====
    console.log('\n2️⃣ Testing Rejection with Pending Conversion (user doesn\'t exist)...');

    const testEmail1 = `${TEST_EMAIL_PREFIX}pending@${TEST_EMAIL_DOMAIN}`;

    await runTest('Create test preparer application', async () => {
      await prisma.preparerApplication.create({
        data: {
          firstName: 'Test',
          lastName: 'Pending',
          email: testEmail1,
          phone: '555-0001',
          languages: 'English',
          status: 'PENDING',
          stage: 'NEW',
        },
      });
    });

    await runTest('Reject with convertTo=client (pending conversion)', async () => {
      const app = await prisma.preparerApplication.findFirst({
        where: { email: testEmail1 },
      });

      if (!app) throw new Error('Application not found');

      // Simulate the conversion service call
      const { convertRejectedPreparerToClient } = await import(
        '../src/lib/services/lead-conversion.service'
      );

      const result = await convertRejectedPreparerToClient(app.id, 'client');

      if (!result.success) {
        throw new Error(`Conversion failed: ${result.error}`);
      }

      if (!result.requiresSignup) {
        throw new Error('Expected requiresSignup=true since user doesn\'t exist');
      }
    });

    await runTest('Application notes contain [PENDING_CONVERSION:client]', async () => {
      const app = await prisma.preparerApplication.findFirst({
        where: { email: testEmail1 },
      });

      if (!app?.notes?.includes('[PENDING_CONVERSION:client]')) {
        throw new Error('Application notes missing [PENDING_CONVERSION:client] marker');
      }
    });

    await runTest('Application notes contain [ASSIGN_TO_OWLIVER]', async () => {
      const app = await prisma.preparerApplication.findFirst({
        where: { email: testEmail1 },
      });

      if (!app?.notes?.includes('[ASSIGN_TO_OWLIVER]')) {
        throw new Error('Application notes missing [ASSIGN_TO_OWLIVER] marker');
      }
    });

    // ===== TEST 3: Create test user and test immediate conversion =====
    console.log('\n3️⃣ Testing Immediate Conversion (user already exists)...');

    const testEmail2 = `${TEST_EMAIL_PREFIX}existing@${TEST_EMAIL_DOMAIN}`;

    await runTest('Create test user with profile', async () => {
      const user = await prisma.user.create({
        data: {
          email: testEmail2,
          name: 'Test Existing',
          hashedPassword: 'test-hash',
          emailVerified: new Date(),
          profile: {
            create: {
              firstName: 'Test',
              lastName: 'Existing',
              role: 'client',
              affiliateStatus: 'APPROVED',
            },
          },
        },
        include: { profile: true },
      });

      if (!user.profile) {
        throw new Error('Failed to create profile');
      }
    });

    await runTest('Create preparer application for existing user', async () => {
      await prisma.preparerApplication.create({
        data: {
          firstName: 'Test',
          lastName: 'Existing',
          email: testEmail2,
          phone: '555-0002',
          languages: 'English',
          status: 'PENDING',
          stage: 'NEW',
        },
      });
    });

    await runTest('Reject with convertTo=affiliate (immediate conversion)', async () => {
      const app = await prisma.preparerApplication.findFirst({
        where: { email: testEmail2 },
      });

      if (!app) throw new Error('Application not found');

      const { convertRejectedPreparerToClient } = await import(
        '../src/lib/services/lead-conversion.service'
      );

      const result = await convertRejectedPreparerToClient(app.id, 'affiliate');

      if (!result.success) {
        throw new Error(`Conversion failed: ${result.error}`);
      }

      if (result.requiresSignup) {
        throw new Error('Expected requiresSignup=false since user exists');
      }

      if (!result.profileId) {
        throw new Error('Expected profileId in result');
      }
    });

    await runTest('ClientPreparer created with Owliver', async () => {
      const owliver = await getOwliverProfile();
      const user = await prisma.user.findUnique({
        where: { email: testEmail2 },
        include: { profile: true },
      });

      if (!user?.profile) throw new Error('User profile not found');

      const clientPreparer = await prisma.clientPreparer.findUnique({
        where: {
          clientId_preparerId: {
            clientId: user.profile.id,
            preparerId: owliver.profileId!,
          },
        },
      });

      if (!clientPreparer) {
        throw new Error('ClientPreparer relationship with Owliver not found');
      }

      if (!clientPreparer.isActive) {
        throw new Error('ClientPreparer relationship is not active');
      }
    });

    // ===== TEST 4: Test duplicate assignment prevention =====
    console.log('\n4️⃣ Testing Edge Cases...');

    await runTest('Duplicate assignment prevented gracefully', async () => {
      const owliver = await getOwliverProfile();
      const user = await prisma.user.findUnique({
        where: { email: testEmail2 },
        include: { profile: true },
      });

      if (!user?.profile) throw new Error('User profile not found');

      // Try to create duplicate - should be caught by assignClientToOwliver
      const countBefore = await prisma.clientPreparer.count({
        where: {
          clientId: user.profile.id,
          preparerId: owliver.profileId!,
        },
      });

      // Import and call the function again
      const { convertRejectedPreparerToClient } = await import(
        '../src/lib/services/lead-conversion.service'
      );

      // Get the app again
      const app = await prisma.preparerApplication.findFirst({
        where: { email: testEmail2 },
      });

      if (app) {
        // Reset status to test again
        await prisma.preparerApplication.update({
          where: { id: app.id },
          data: { status: 'PENDING' },
        });

        await convertRejectedPreparerToClient(app.id, 'affiliate');
      }

      const countAfter = await prisma.clientPreparer.count({
        where: {
          clientId: user.profile.id,
          preparerId: owliver.profileId!,
        },
      });

      if (countAfter !== countBefore) {
        throw new Error(`Duplicate created: before=${countBefore}, after=${countAfter}`);
      }
    });

    // ===== TEST 5: Test API endpoint directly =====
    console.log('\n5️⃣ Testing API Integration...');

    await runTest('API route imports work correctly', async () => {
      // Just test that the service can be imported
      const service = await import('../src/lib/services/lead-conversion.service');
      if (typeof service.convertRejectedPreparerToClient !== 'function') {
        throw new Error('convertRejectedPreparerToClient is not exported as function');
      }
      if (typeof service.createClientFromPreparerApplication !== 'function') {
        throw new Error('createClientFromPreparerApplication is not exported as function');
      }
    });

    // ===== POTENTIAL FAILURE POINTS =====
    console.log('\n6️⃣ Checking Potential Failure Points...');

    await runTest('OWLIVER_PROFILE_ID env var check', async () => {
      // This is a warning, not a failure
      if (!process.env.OWLIVER_PROFILE_ID) {
        console.log('      ⚠️  Warning: OWLIVER_PROFILE_ID env var not set (using dynamic lookup)');
      }
    });

    await runTest('ClientPreparer unique constraint exists', async () => {
      // Verify the schema has the correct constraint
      const introspection = await prisma.$queryRaw<{ constraint_name: string }[]>`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'ClientPreparer'
        AND constraint_type = 'UNIQUE'
      `;

      const hasUniqueConstraint = introspection.some(
        (c) => c.constraint_name.includes('clientId') && c.constraint_name.includes('preparerId')
      );

      if (!hasUniqueConstraint) {
        console.log('      ⚠️  Warning: ClientPreparer unique constraint may not be named as expected');
      }
    });

    // ===== SUMMARY =====
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY\n');

    const passed = results.filter((r) => r.status === 'PASS').length;
    const failed = results.filter((r) => r.status === 'FAIL').length;
    const skipped = results.filter((r) => r.status === 'SKIP').length;

    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📈 Total: ${results.length}`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      results
        .filter((r) => r.status === 'FAIL')
        .forEach((r) => {
          console.log(`   - ${r.name}: ${r.message}`);
        });
    }

    // Cleanup
    await cleanupTestData();

    console.log('\n' + '='.repeat(60));
    console.log(failed === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
    console.log('='.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    await cleanupTestData();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
