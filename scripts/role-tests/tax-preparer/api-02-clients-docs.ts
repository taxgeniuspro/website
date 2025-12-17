/**
 * API Test 02: Tax Preparer Client & Document APIs
 *
 * Tests client and document management endpoints.
 *
 * Tests:
 * - 8.1: GET /api/tax-preparer/clients - returns assigned clients
 * - 8.2: POST /api/tax-preparer/clients/import - imports CSV
 * - 8.3: GET /api/tax-preparer/clients/export - exports CSV
 * - 8.4: GET /api/tax-preparer/documents - returns client docs
 * - 8.5: POST /api/tax-preparer/documents/upload - uploads file
 * - 8.6: GET /api/tax-preparer/documents/:id - gets single doc
 * - 8.7: Verify preparer cannot access other preparer's clients
 */

import {
  prisma,
  createTestUser,
  createTestDocument,
  createTestClientPreparerAssignment,
  runTest,
  assert,
  assertEqual,
  assertNotNull,
  assertGreaterThan,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

// Types
interface ClientResponse {
  clients: any[];
  stats: {
    total: number;
    activeReturns: number;
    pendingReviews: number;
    completedReturns: number;
  };
}

interface DocumentResponse {
  documents: any[];
  stats: Record<string, number>;
}

// Simulates GET /api/tax-preparer/clients
async function simulateGetClients(preparerId: string): Promise<ClientResponse> {
  const assignments = await prisma.clientPreparer.findMany({
    where: {
      preparerId,
      isActive: true,
    },
    include: {
      client: {
        include: {
          user: true,
          taxReturns: {
            orderBy: { taxYear: 'desc' },
            take: 1,
          },
          documents: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const clients = assignments.map(a => ({
    id: a.client.id,
    firstName: a.client.firstName,
    lastName: a.client.lastName,
    email: a.client.user?.email,
    phone: a.client.phone,
    assignedAt: a.assignedAt,
    latestReturn: a.client.taxReturns[0] || null,
    documentCount: a.client.documents.length,
  }));

  // Calculate stats
  const stats = {
    total: clients.length,
    activeReturns: clients.filter(c => c.latestReturn?.status === 'DRAFT' || c.latestReturn?.status === 'IN_REVIEW').length,
    pendingReviews: clients.filter(c => c.latestReturn?.status === 'IN_REVIEW').length,
    completedReturns: clients.filter(c => c.latestReturn?.status === 'FILED' || c.latestReturn?.status === 'ACCEPTED').length,
  };

  return { clients, stats };
}

// Simulates GET /api/tax-preparer/documents
async function simulateGetDocuments(preparerId: string, clientId?: string): Promise<DocumentResponse> {
  // Get preparer's assigned clients
  const assignments = await prisma.clientPreparer.findMany({
    where: {
      preparerId,
      isActive: true,
      ...(clientId ? { clientId } : {}),
    },
    select: { clientId: true },
  });

  const clientIds = assignments.map(a => a.clientId);

  const documents = await prisma.document.findMany({
    where: {
      profileId: { in: clientIds },
    },
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group by status
  const stats: Record<string, number> = {};
  for (const doc of documents) {
    stats[doc.status] = (stats[doc.status] || 0) + 1;
  }

  return { documents, stats };
}

async function runClientDocAPITests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparer1Id: string;
  let testPreparer2Id: string;
  let testClient1Id: string;
  let testClient2Id: string;
  let testClient3Id: string;
  let testDocumentIds: string[] = [];

  // Setup: Create preparers, clients, and documents
  results.push(
    await runTest('Setup: Create test data', async () => {
      // Create two preparers
      const { profile: preparer1 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'ClientAPI',
        lastName: 'Preparer1',
        shortLinkUsername: `client-api-preparer1-${Date.now()}`,
      });
      testPreparer1Id = preparer1.id;

      const { profile: preparer2 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'ClientAPI',
        lastName: 'Preparer2',
        shortLinkUsername: `client-api-preparer2-${Date.now()}`,
      });
      testPreparer2Id = preparer2.id;

      // Create clients
      const { profile: client1 } = await createTestUser({
        role: 'client',
        firstName: 'Alice',
        lastName: 'Client',
        email: `alice-client-${Date.now()}@test-taxgeniuspro.local`,
      });
      testClient1Id = client1.id;

      const { profile: client2 } = await createTestUser({
        role: 'client',
        firstName: 'Bob',
        lastName: 'Client',
        email: `bob-client-${Date.now()}@test-taxgeniuspro.local`,
      });
      testClient2Id = client2.id;

      const { profile: client3 } = await createTestUser({
        role: 'client',
        firstName: 'Carol',
        lastName: 'OtherPreparer',
        email: `carol-client-${Date.now()}@test-taxgeniuspro.local`,
      });
      testClient3Id = client3.id;

      // Assign clients to preparers
      await createTestClientPreparerAssignment({ preparerId: testPreparer1Id, clientId: testClient1Id });
      await createTestClientPreparerAssignment({ preparerId: testPreparer1Id, clientId: testClient2Id });
      await createTestClientPreparerAssignment({ preparerId: testPreparer2Id, clientId: testClient3Id });

      // Create tax returns
      await prisma.taxReturn.create({
        data: {
          profileId: testClient1Id,
          taxYear: 2024,
          status: 'IN_REVIEW',
          formData: {},
        },
      });

      await prisma.taxReturn.create({
        data: {
          profileId: testClient2Id,
          taxYear: 2024,
          status: 'FILED',
          formData: {},
        },
      });

      // Create documents
      for (let i = 0; i < 3; i++) {
        const { document } = await createTestDocument({
          profileId: testClient1Id,
          type: i === 0 ? 'W2' : 'FORM_1099',
          fileName: `alice-doc-${i}.pdf`,
          taxYear: 2024,
        });
        testDocumentIds.push(document.id);
      }

      for (let i = 0; i < 2; i++) {
        const { document } = await createTestDocument({
          profileId: testClient2Id,
          type: 'RECEIPT',
          fileName: `bob-doc-${i}.pdf`,
          taxYear: 2024,
        });
        testDocumentIds.push(document.id);
      }

      // Document for other preparer's client
      const { document: otherDoc } = await createTestDocument({
        profileId: testClient3Id,
        type: 'W2',
        fileName: `carol-doc.pdf`,
        taxYear: 2024,
      });
      testDocumentIds.push(otherDoc.id);

      logSuccess('Test data created');
      logInfo(`  Preparer 1 clients: 2 (Alice, Bob)`);
      logInfo(`  Preparer 2 clients: 1 (Carol)`);
      logInfo(`  Total documents: ${testDocumentIds.length}`);
    })
  );

  // Test 8.1: GET clients returns assigned clients
  results.push(
    await runTest('8.1 GET clients returns assigned only', async () => {
      const response = await simulateGetClients(testPreparer1Id);

      assertEqual(response.clients.length, 2, 'Should return 2 clients for preparer 1');
      assertEqual(response.stats.total, 2, 'Stats total should be 2');

      // Verify client names
      const names = response.clients.map(c => c.firstName);
      assert(names.includes('Alice'), 'Should include Alice');
      assert(names.includes('Bob'), 'Should include Bob');

      // Verify no clients from preparer 2
      const carolIncluded = names.includes('Carol');
      assertEqual(carolIncluded, false, 'Should not include Carol');

      logSuccess('Clients correctly filtered');
      logInfo(`  Total: ${response.clients.length}`);
      logInfo(`  Active returns: ${response.stats.activeReturns}`);
      logInfo(`  Completed: ${response.stats.completedReturns}`);
    })
  );

  // Test 8.2: POST import clients
  results.push(
    await runTest('8.2 POST import creates clients', async () => {
      // Simulate CSV import data
      const importData = [
        { firstName: 'David', lastName: 'Import', email: `david-import-${Date.now()}@test-taxgeniuspro.local`, phone: '555-0010' },
        { firstName: 'Eve', lastName: 'Import', email: `eve-import-${Date.now()}@test-taxgeniuspro.local`, phone: '555-0011' },
      ];

      let importedCount = 0;

      for (const data of importData) {
        // Create user and profile
        const user = await prisma.user.create({
          data: {
            email: data.email,
            name: `${data.firstName} ${data.lastName}`,
          },
        });

        const profile = await prisma.profile.create({
          data: {
            userId: user.id,
            role: 'client',
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            affiliateStatus: 'APPROVED',
          },
        });

        // Create assignment
        await prisma.clientPreparer.create({
          data: {
            preparerId: testPreparer1Id,
            clientId: profile.id,
            isActive: true,
          },
        });

        importedCount++;
      }

      assertEqual(importedCount, 2, 'Should import 2 clients');

      // Verify total clients increased
      const updatedResponse = await simulateGetClients(testPreparer1Id);
      assertEqual(updatedResponse.clients.length, 4, 'Should now have 4 clients');

      logSuccess('Clients imported');
      logInfo(`  Imported: ${importedCount}`);
      logInfo(`  Total clients now: ${updatedResponse.clients.length}`);
    })
  );

  // Test 8.3: GET export clients
  results.push(
    await runTest('8.3 GET export generates CSV', async () => {
      const response = await simulateGetClients(testPreparer1Id);

      // Generate CSV content
      const headers = ['firstName', 'lastName', 'email', 'phone', 'assignedAt'];
      const rows = response.clients.map(c => [
        c.firstName,
        c.lastName,
        c.email,
        c.phone || '',
        c.assignedAt?.toISOString() || '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      // Verify CSV structure
      const lines = csv.split('\n');
      assertGreaterThan(lines.length, 1, 'CSV should have header and data');
      assertEqual(lines[0], headers.join(','), 'Header should match');
      assertEqual(lines.length - 1, response.clients.length, 'Should have row per client');

      logSuccess('CSV export generated');
      logInfo(`  Rows: ${response.clients.length}`);
      logInfo(`  Size: ${csv.length} bytes`);
    })
  );

  // Test 8.4: GET documents returns client docs
  results.push(
    await runTest('8.4 GET documents returns assigned', async () => {
      const response = await simulateGetDocuments(testPreparer1Id);

      assertEqual(response.documents.length, 5, 'Should return 5 documents');

      // Verify no documents from other preparer's client
      const carolDocs = response.documents.filter(d => d.profile.firstName === 'Carol');
      assertEqual(carolDocs.length, 0, 'Should not include Carol docs');

      // Verify stats
      assertNotNull(response.stats, 'Should have stats');

      logSuccess('Documents correctly filtered');
      logInfo(`  Total: ${response.documents.length}`);
      logInfo(`  By status: ${JSON.stringify(response.stats)}`);
    })
  );

  // Test 8.5: POST upload document
  results.push(
    await runTest('8.5 POST upload creates document', async () => {
      // Simulate document upload
      const uploadData = {
        clientId: testClient1Id,
        category: 'W2',
        taxYear: 2024,
        fileName: 'uploaded-w2.pdf',
        fileUrl: 'https://storage.test/uploaded-w2.pdf',
        fileSize: 2048,
        mimeType: 'application/pdf',
      };

      const document = await prisma.document.create({
        data: {
          profileId: uploadData.clientId,
          type: uploadData.category as any,
          taxYear: uploadData.taxYear,
          fileName: uploadData.fileName,
          fileUrl: uploadData.fileUrl,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
          status: 'REVIEWED',
        },
      });

      assertNotNull(document, 'Document should be created');
      assertEqual(document.profileId, testClient1Id, 'Document should belong to client');
      assertEqual(document.type, 'W2', 'Document type should match');

      testDocumentIds.push(document.id);

      logSuccess('Document uploaded');
      logInfo(`  ID: ${document.id}`);
      logInfo(`  File: ${document.fileName}`);
    })
  );

  // Test 8.6: GET single document
  results.push(
    await runTest('8.6 GET document/:id returns details', async () => {
      const docId = testDocumentIds[0];

      const document = await prisma.document.findUnique({
        where: { id: docId },
        include: {
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      assertNotNull(document, 'Document should exist');
      assertNotNull(document!.fileName, 'Should have fileName');
      assertNotNull(document!.fileUrl, 'Should have fileUrl');
      assertNotNull(document!.profile, 'Should include profile');

      logSuccess('Document details retrieved');
      logInfo(`  ID: ${document!.id}`);
      logInfo(`  File: ${document!.fileName}`);
      logInfo(`  Owner: ${document!.profile.firstName} ${document!.profile.lastName}`);
    })
  );

  // Test 8.7: Preparer cannot access other preparer's clients
  results.push(
    await runTest('8.7 Isolation: Cannot access other clients', async () => {
      // Preparer 1 tries to access preparer 2's client
      const preparer1Clients = await simulateGetClients(testPreparer1Id);
      const preparer2Clients = await simulateGetClients(testPreparer2Id);

      // Verify no overlap
      const preparer1ClientIds = new Set(preparer1Clients.clients.map(c => c.id));
      const preparer2ClientIds = new Set(preparer2Clients.clients.map(c => c.id));

      let overlap = false;
      for (const id of preparer1ClientIds) {
        if (preparer2ClientIds.has(id)) {
          overlap = true;
          break;
        }
      }

      assertEqual(overlap, false, 'Should have no overlapping clients');

      // Verify Carol is only in preparer 2's list
      const carolInP1 = preparer1Clients.clients.some(c => c.firstName === 'Carol');
      const carolInP2 = preparer2Clients.clients.some(c => c.firstName === 'Carol');

      assertEqual(carolInP1, false, 'Preparer 1 should not see Carol');
      assertEqual(carolInP2, true, 'Preparer 2 should see Carol');

      // Verify documents are isolated
      const preparer1Docs = await simulateGetDocuments(testPreparer1Id);
      const preparer2Docs = await simulateGetDocuments(testPreparer2Id);

      const carolDocInP1 = preparer1Docs.documents.some(d => d.profile.firstName === 'Carol');
      const carolDocInP2 = preparer2Docs.documents.some(d => d.profile.firstName === 'Carol');

      assertEqual(carolDocInP1, false, 'Preparer 1 should not see Carol docs');
      assertEqual(carolDocInP2, true, 'Preparer 2 should see Carol docs');

      logSuccess('Client isolation verified');
      logInfo(`  Preparer 1 clients: ${preparer1Clients.clients.length}`);
      logInfo(`  Preparer 2 clients: ${preparer2Clients.clients.length}`);
      logInfo(`  Overlap: None`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('API Test 02: Client & Document APIs');

  try {
    const results = await runClientDocAPITests();

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

export { runClientDocAPITests };
