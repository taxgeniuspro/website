/**
 * Test Data Cleanup
 *
 * Provides utilities for cleaning up test data after test runs.
 * Only removes data created by tests (identified by TEST_ prefix or test email domain).
 */

import { prisma, TEST_PREFIX, TEST_EMAIL_DOMAIN } from './test-data-factory';

/**
 * Clean up all test data created during tests
 */
export async function cleanupAllTestData(): Promise<{
  deletedCounts: Record<string, number>;
  errors: string[];
}> {
  const deletedCounts: Record<string, number> = {};
  const errors: string[] = [];

  try {
    // Delete in order of dependencies (children first)

    // 1. Delete test link clicks
    const linkClicks = await prisma.linkClick.deleteMany({
      where: {
        link: {
          code: { startsWith: 'test-link-' },
        },
      },
    });
    deletedCounts.linkClicks = linkClicks.count;

    // 2. Delete test commissions (referrer has test email)
    const commissions = await prisma.commission.deleteMany({
      where: {
        referrer: {
          user: {
            email: { endsWith: TEST_EMAIL_DOMAIN },
          },
        },
      },
    });
    deletedCounts.commissions = commissions.count;

    // 3. Delete test referrals
    const referrals = await prisma.referral.deleteMany({
      where: {
        OR: [
          { referrer: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } } },
          { client: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } } },
        ],
      },
    });
    deletedCounts.referrals = referrals.count;

    // 4. Delete test client-preparer assignments
    const assignments = await prisma.clientPreparer.deleteMany({
      where: {
        OR: [
          { preparer: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } } },
          { client: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } } },
        ],
      },
    });
    deletedCounts.clientPreparerAssignments = assignments.count;

    // 5. Delete test documents
    const documents = await prisma.document.deleteMany({
      where: {
        profile: {
          user: {
            email: { endsWith: TEST_EMAIL_DOMAIN },
          },
        },
      },
    });
    deletedCounts.documents = documents.count;

    // 6. Delete test tax returns
    const taxReturns = await prisma.taxReturn.deleteMany({
      where: {
        profile: {
          user: {
            email: { endsWith: TEST_EMAIL_DOMAIN },
          },
        },
      },
    });
    deletedCounts.taxReturns = taxReturns.count;

    // 7. Delete test marketing links
    const marketingLinks = await prisma.marketingLink.deleteMany({
      where: {
        code: { startsWith: 'test-link-' },
      },
    });
    deletedCounts.marketingLinks = marketingLinks.count;

    // 8. Delete test leads
    const leads = await prisma.lead.deleteMany({
      where: {
        email: { endsWith: TEST_EMAIL_DOMAIN },
      },
    });
    deletedCounts.leads = leads.count;

    // 9. Delete test intake leads
    const intakeLeads = await prisma.taxIntakeLead.deleteMany({
      where: {
        email: { endsWith: TEST_EMAIL_DOMAIN },
      },
    });
    deletedCounts.intakeLeads = intakeLeads.count;

    // 10. Delete test preparer applications
    const applications = await prisma.preparerApplication.deleteMany({
      where: {
        email: { endsWith: TEST_EMAIL_DOMAIN },
      },
    });
    deletedCounts.preparerApplications = applications.count;

    // 11. Delete test profiles
    const profiles = await prisma.profile.deleteMany({
      where: {
        user: {
          email: { endsWith: TEST_EMAIL_DOMAIN },
        },
      },
    });
    deletedCounts.profiles = profiles.count;

    // 12. Delete test users
    const users = await prisma.user.deleteMany({
      where: {
        email: { endsWith: TEST_EMAIL_DOMAIN },
      },
    });
    deletedCounts.users = users.count;
  } catch (error) {
    errors.push(`Cleanup error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { deletedCounts, errors };
}

/**
 * Clean up test data for a specific test run (by test ID pattern)
 */
export async function cleanupTestById(testId: string): Promise<number> {
  let totalDeleted = 0;

  // Delete leads with matching test ID in email
  const leads = await prisma.lead.deleteMany({
    where: {
      email: { contains: testId.toLowerCase() },
    },
  });
  totalDeleted += leads.count;

  // Delete users with matching test ID in email
  const users = await prisma.user.deleteMany({
    where: {
      email: { contains: testId.toLowerCase() },
    },
  });
  totalDeleted += users.count;

  return totalDeleted;
}

/**
 * Clean up commissions by referrer profile ID
 */
export async function cleanupCommissionsByReferrer(referrerId: string): Promise<number> {
  const result = await prisma.commission.deleteMany({
    where: { referrerId },
  });
  return result.count;
}

/**
 * Clean up leads by referrer username
 */
export async function cleanupLeadsByReferrer(referrerUsername: string): Promise<number> {
  const result = await prisma.lead.deleteMany({
    where: { referrerUsername },
  });
  return result.count;
}

/**
 * Get count of test data in database
 */
export async function countTestData(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  counts.users = await prisma.user.count({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
  });

  counts.profiles = await prisma.profile.count({
    where: { user: { email: { endsWith: TEST_EMAIL_DOMAIN } } },
  });

  counts.leads = await prisma.lead.count({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
  });

  counts.intakeLeads = await prisma.taxIntakeLead.count({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
  });

  counts.applications = await prisma.preparerApplication.count({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN } },
  });

  counts.marketingLinks = await prisma.marketingLink.count({
    where: { code: { startsWith: 'test-link-' } },
  });

  return counts;
}

/**
 * Print test data cleanup summary
 */
export function printCleanupSummary(
  deletedCounts: Record<string, number>,
  errors: string[]
): void {
  console.log('\n============ Test Data Cleanup Summary ============');

  let totalDeleted = 0;
  for (const [table, count] of Object.entries(deletedCounts)) {
    if (count > 0) {
      console.log(`  ${table}: ${count} deleted`);
      totalDeleted += count;
    }
  }

  if (totalDeleted === 0) {
    console.log('  No test data found to clean up');
  } else {
    console.log(`\n  Total: ${totalDeleted} records deleted`);
  }

  if (errors.length > 0) {
    console.log('\n  Errors:');
    errors.forEach((error) => console.log(`    - ${error}`));
  }

  console.log('===================================================\n');
}

/**
 * Run cleanup as standalone script
 */
async function main() {
  console.log('Starting test data cleanup...');

  // First count existing test data
  const counts = await countTestData();
  console.log('\nTest data before cleanup:', counts);

  // Run cleanup
  const { deletedCounts, errors } = await cleanupAllTestData();

  // Print summary
  printCleanupSummary(deletedCounts, errors);

  // Verify cleanup
  const countsAfter = await countTestData();
  console.log('Test data after cleanup:', countsAfter);

  await prisma.$disconnect();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}
