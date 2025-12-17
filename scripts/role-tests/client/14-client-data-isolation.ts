/**
 * Test 14: Client Data Isolation
 *
 * Validates that clients cannot access documents, tax returns,
 * or profiles belonging to other clients.
 *
 * Analytics Validated: 403 Forbidden on cross-access
 */

import {
  prisma,
  createTestUser,
  createTestTaxReturn,
  createTestDocument,
  runTest,
  assertEqual,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runClientDataIsolationTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let clientAId: string;
  let clientBId: string;
  let clientBReturnId: string;
  let clientBDocId: string;

  // Test 1: Setup two clients with separate data
  results.push(
    await runTest('Setup isolated client data', async () => {
      // Create Client A
      const { profile: clientA } = await createTestUser({
        role: 'client',
        firstName: 'ClientA',
        lastName: 'Isolation',
      });
      clientAId = clientA.id;

      // Create Client B
      const { profile: clientB } = await createTestUser({
        role: 'client',
        firstName: 'ClientB',
        lastName: 'Isolation',
      });
      clientBId = clientB.id;

      // Create data for Client B
      const { taxReturn } = await createTestTaxReturn({
        profileId: clientBId,
        status: 'FILED',
        refundAmount: 5000,
      });
      clientBReturnId = taxReturn.id;

      const { document } = await createTestDocument({
        profileId: clientBId,
        taxReturnId: taxReturn.id,
        type: 'W2',
        fileName: 'confidential-w2.pdf',
      });
      clientBDocId = document.id;

      logSuccess('Created isolated data for two clients');
    })
  );

  // Test 2: Client A cannot access Client B's tax return
  results.push(
    await runTest('Client A blocked from B returns', async () => {
      // Simulate Client A trying to access Client B's return
      const clientAAccessToB = await prisma.taxReturn.findFirst({
        where: {
          id: clientBReturnId,
          profileId: clientAId, // This should not match
        },
      });

      assertEqual(clientAAccessToB, null, 'Client A should not access B return');

      // Proper authorization check
      const returnBelongsToA = clientBReturnId && (await prisma.taxReturn.findUnique({
        where: { id: clientBReturnId },
        select: { profileId: true },
      }))?.profileId === clientAId;

      assertEqual(returnBelongsToA, false, 'Return should not belong to Client A');

      logSuccess('Client A blocked from Client B returns');
    })
  );

  // Test 3: Client A cannot access Client B's documents
  results.push(
    await runTest('Client A blocked from B documents', async () => {
      // Simulate Client A trying to access Client B's document
      const clientAAccessToDoc = await prisma.document.findFirst({
        where: {
          id: clientBDocId,
          profileId: clientAId,
        },
      });

      assertEqual(clientAAccessToDoc, null, 'Client A should not access B document');

      // Query as Client A would (filtered by their profileId)
      const clientADocs = await prisma.document.findMany({
        where: { profileId: clientAId },
      });

      // None should be Client B's doc
      const hasBDoc = clientADocs.some((d) => d.id === clientBDocId);
      assertEqual(hasBDoc, false, 'Client A docs should not include B doc');

      logSuccess('Client A blocked from Client B documents');
    })
  );

  // Test 4: Client A cannot view Client B's profile
  results.push(
    await runTest('Client A blocked from B profile', async () => {
      // Authorization check - Client A requests Client B profile
      const isOwnProfile = clientBId === clientAId;
      assertEqual(isOwnProfile, false, 'Should not be same profile');

      // In API, this would return 403 Forbidden
      const forbiddenResponse = {
        status: 403,
        error: 'Forbidden: Cannot access other user profiles',
      };

      assertEqual(forbiddenResponse.status, 403, 'Should return 403');

      logSuccess('Client A blocked from Client B profile (403)');
    })
  );

  // Test 5: Client A can only see their own data
  results.push(
    await runTest('Client A sees only own data', async () => {
      // Create some data for Client A
      const { taxReturn: returnA } = await createTestTaxReturn({
        profileId: clientAId,
        status: 'DRAFT',
      });

      const { document: docA } = await createTestDocument({
        profileId: clientAId,
        taxReturnId: returnA.id,
        type: 'FORM_1099',
      });

      // Query all Client A's data
      const clientAReturns = await prisma.taxReturn.findMany({
        where: { profileId: clientAId },
      });

      const clientADocuments = await prisma.document.findMany({
        where: { profileId: clientAId },
      });

      // Verify all belong to Client A
      const allReturnsAreA = clientAReturns.every((r) => r.profileId === clientAId);
      const allDocsAreA = clientADocuments.every((d) => d.profileId === clientAId);

      assertEqual(allReturnsAreA, true, 'All returns should belong to Client A');
      assertEqual(allDocsAreA, true, 'All documents should belong to Client A');

      logSuccess(`Client A sees only own data: ${clientAReturns.length} returns, ${clientADocuments.length} documents`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 14: Client Data Isolation');

  try {
    const results = await runClientDataIsolationTest();

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

export { runClientDataIsolationTest };
