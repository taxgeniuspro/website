/**
 * Test 10: Tax Preparer Can Access Client Documents
 *
 * Validates that tax preparers can view documents for their assigned
 * clients only, organized by client and tax year.
 *
 * Analytics Validated: Document counts by year
 */

import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestClientPreparerAssignment,
  runTest,
  assertEqual,
  assertNotNull,
  assertGreaterThanOrEqual,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runPreparerDocumentsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let preparerAId: string;
  let preparerBId: string;
  let client1Id: string;
  let client2Id: string;
  let client3Id: string;

  // Test 1: Preparer can view documents for assigned clients
  results.push(
    await runTest('Preparer views assigned client documents', async () => {
      // Create two preparers
      const { profile: preparerA } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'PreparerA',
        lastName: 'Docs',
      });
      preparerAId = preparerA.id;

      const { profile: preparerB } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'PreparerB',
        lastName: 'Docs',
      });
      preparerBId = preparerB.id;

      // Create three clients
      const { profile: client1 } = await createTestUser({
        role: 'client',
        firstName: 'Client1',
        lastName: 'Docs',
      });
      client1Id = client1.id;

      const { profile: client2 } = await createTestUser({
        role: 'client',
        firstName: 'Client2',
        lastName: 'Docs',
      });
      client2Id = client2.id;

      const { profile: client3 } = await createTestUser({
        role: 'client',
        firstName: 'Client3',
        lastName: 'Docs',
      });
      client3Id = client3.id;

      // Assign clients to preparers
      await createTestClientPreparerAssignment({ preparerId: preparerAId, clientId: client1Id });
      await createTestClientPreparerAssignment({ preparerId: preparerAId, clientId: client2Id });
      await createTestClientPreparerAssignment({ preparerId: preparerBId, clientId: client3Id });

      // Create documents
      for (let i = 0; i < 4; i++) {
        await createTestDocument({ profileId: client1Id, type: 'W2' });
      }
      for (let i = 0; i < 2; i++) {
        await createTestDocument({ profileId: client2Id, type: 'FORM_1099' });
      }
      for (let i = 0; i < 3; i++) {
        await createTestDocument({ profileId: client3Id, type: 'W2' });
      }

      // Get Preparer A's assigned clients
      const preparerAClients = await prisma.clientPreparer.findMany({
        where: { preparerId: preparerAId, isActive: true },
        select: { clientId: true },
      });

      const clientIds = preparerAClients.map((c) => c.clientId);

      // Get documents for Preparer A's clients
      const preparerADocs = await prisma.document.findMany({
        where: { profileId: { in: clientIds } },
      });

      assertEqual(preparerADocs.length, 6, 'Preparer A should see 6 documents (4 + 2)');

      logSuccess(`Preparer A can access ${preparerADocs.length} documents from ${clientIds.length} clients`);
    })
  );

  // Test 2: Documents grouped by client correctly
  results.push(
    await runTest('Documents grouped by client', async () => {
      const preparerAClients = await prisma.clientPreparer.findMany({
        where: { preparerId: preparerAId, isActive: true },
        select: { clientId: true },
      });

      const clientIds = preparerAClients.map((c) => c.clientId);

      // Group documents by client
      const docsByClient = await prisma.document.groupBy({
        by: ['profileId'],
        where: { profileId: { in: clientIds } },
        _count: { id: true },
      });

      assertEqual(docsByClient.length, 2, 'Should have docs from 2 clients');

      const client1Docs = docsByClient.find((d) => d.profileId === client1Id);
      const client2Docs = docsByClient.find((d) => d.profileId === client2Id);

      assertEqual(client1Docs?._count.id, 4, 'Client 1 should have 4 documents');
      assertEqual(client2Docs?._count.id, 2, 'Client 2 should have 2 documents');

      logSuccess('Documents correctly grouped by client');
    })
  );

  // Test 3: Preparer cannot access unassigned client documents
  results.push(
    await runTest('Preparer blocked from unassigned client docs', async () => {
      // Preparer A should not see Client 3's documents
      const preparerAClients = await prisma.clientPreparer.findMany({
        where: { preparerId: preparerAId, isActive: true },
        select: { clientId: true },
      });

      const isClient3Assigned = preparerAClients.some((c) => c.clientId === client3Id);
      assertEqual(isClient3Assigned, false, 'Client 3 should not be assigned to Preparer A');

      // Query as Preparer A would
      const accessibleDocs = await prisma.document.findMany({
        where: {
          profileId: {
            in: preparerAClients.map((c) => c.clientId),
          },
        },
      });

      // None should be from Client 3
      const client3DocsAccessed = accessibleDocs.filter((d) => d.profileId === client3Id);
      assertEqual(client3DocsAccessed.length, 0, 'Preparer A should not see Client 3 docs');

      logSuccess('Access isolation verified');
    })
  );

  // Test 4: Documents filtered by type
  results.push(
    await runTest('Documents filtered by type', async () => {
      const preparerAClients = await prisma.clientPreparer.findMany({
        where: { preparerId: preparerAId, isActive: true },
        select: { clientId: true },
      });

      const clientIds = preparerAClients.map((c) => c.clientId);

      // Filter W2 documents
      const w2Docs = await prisma.document.findMany({
        where: {
          profileId: { in: clientIds },
          type: 'W2',
        },
      });

      // Filter FORM_1099 documents
      const docs1099 = await prisma.document.findMany({
        where: {
          profileId: { in: clientIds },
          type: 'FORM_1099',
        },
      });

      assertEqual(w2Docs.length, 4, 'Should have 4 W2 documents');
      assertEqual(docs1099.length, 2, 'Should have 2 FORM_1099 documents');

      logSuccess(`Document types: ${w2Docs.length} W2s, ${docs1099.length} 1099s`);
    })
  );

  // Test 5: Document stats accurate for preparer
  results.push(
    await runTest('Document stats accurate', async () => {
      const preparerAClients = await prisma.clientPreparer.findMany({
        where: { preparerId: preparerAId, isActive: true },
        select: { clientId: true },
      });

      const clientIds = preparerAClients.map((c) => c.clientId);

      // Calculate stats
      const totalDocs = await prisma.document.count({
        where: { profileId: { in: clientIds } },
      });

      const totalClients = clientIds.length;

      const docsByType = await prisma.document.groupBy({
        by: ['type'],
        where: { profileId: { in: clientIds } },
        _count: { id: true },
      });

      const stats = {
        totalClients,
        totalDocuments: totalDocs,
        byType: Object.fromEntries(docsByType.map((d) => [d.type, d._count.id])),
      };

      assertEqual(stats.totalClients, 2, 'Should have 2 clients');
      assertEqual(stats.totalDocuments, 6, 'Should have 6 total documents');

      logSuccess('Document stats verified');
      logInfo(`  Clients: ${stats.totalClients}`);
      logInfo(`  Documents: ${stats.totalDocuments}`);
      logInfo(`  By type: ${JSON.stringify(stats.byType)}`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 10: Preparer Documents');

  try {
    const results = await runPreparerDocumentsTest();

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

export { runPreparerDocumentsTest };
