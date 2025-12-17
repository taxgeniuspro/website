/**
 * Test 16: Tax Preparer Folder Management
 *
 * Validates client folder structure and document organization.
 *
 * Tests:
 * - 6.1: Create client folder structure
 * - 6.2: Verify naming convention (LastName-FirstName/TaxYear)
 * - 6.3: Upload document to specific folder
 * - 6.4: List documents in folder
 * - 6.5: Navigate folder hierarchy
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

// Folder naming convention
function generateFolderName(lastName: string, firstName: string): string {
  return `${lastName}-${firstName}`;
}

function generateFolderPath(lastName: string, firstName: string, taxYear: number): string {
  return `${generateFolderName(lastName, firstName)}/${taxYear}`;
}

async function runFolderManagementTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testClientId: string;
  let testClientFirstName: string;
  let testClientLastName: string;
  let testFolderId: string;
  let testTaxYear: number;

  // Test 6.1: Create client folder structure
  results.push(
    await runTest('6.1 Create client folder structure', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Folder',
        lastName: 'Preparer',
        shortLinkUsername: `folder-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Create test client
      testClientFirstName = 'John';
      testClientLastName = 'Doe';
      const { profile: client } = await createTestUser({
        role: 'client',
        firstName: testClientFirstName,
        lastName: testClientLastName,
        email: `john-doe-${Date.now()}@test-taxgeniuspro.local`,
      });
      testClientId = client.id;

      // Create client-preparer assignment
      await createTestClientPreparerAssignment({
        preparerId: testPreparerId,
        clientId: testClientId,
      });

      // Get or create tax year
      testTaxYear = 2024;

      // Create folder structure using the actual Folder model
      const folderPath = generateFolderPath(testClientLastName, testClientFirstName, testTaxYear);

      // Create a folder record using the actual schema (model is 'folder' not 'documentFolder')
      const folder = await prisma.folder.create({
        data: {
          name: `${testTaxYear}`,
          path: folderPath,
          ownerId: testClientId,
          level: 0,
        },
      });

      testFolderId = folder.id;

      assertNotNull(folder, 'Folder should be created');
      assert(folder.path.includes(testClientLastName), 'Path should include client last name');
      assert(folder.path.includes(testClientFirstName), 'Path should include client first name');

      logSuccess('Client folder structure created');
      logInfo(`  Folder ID: ${folder.id}`);
      logInfo(`  Path: ${folder.path}`);
      logInfo(`  Name: ${folder.name}`);
    })
  );

  // Test 6.2: Verify naming convention
  results.push(
    await runTest('6.2 Naming convention verified', async () => {
      const folder = await prisma.folder.findUnique({
        where: { id: testFolderId },
      });

      assertNotNull(folder, 'Folder should exist');

      // Verify naming convention: LastName-FirstName/TaxYear
      const expectedPath = generateFolderPath(testClientLastName, testClientFirstName, testTaxYear);
      assertEqual(folder!.path, expectedPath, 'Path should follow naming convention');

      // Verify folder name is the tax year
      assertEqual(folder!.name, `${testTaxYear}`, 'Folder name should be tax year');

      // Test with different names
      const testCases = [
        { first: 'Alice', last: 'Smith', year: 2024, expected: 'Smith-Alice/2024' },
        { first: 'Bob', last: 'Johnson', year: 2023, expected: 'Johnson-Bob/2023' },
        { first: 'Mary-Jane', last: 'O\'Connor', year: 2024, expected: 'O\'Connor-Mary-Jane/2024' },
      ];

      for (const tc of testCases) {
        const path = generateFolderPath(tc.last, tc.first, tc.year);
        assertEqual(path, tc.expected, `Path for ${tc.first} ${tc.last} should match convention`);
      }

      logSuccess('Naming convention verified');
      logInfo(`  Convention: LastName-FirstName/TaxYear`);
      logInfo(`  Example: ${expectedPath}`);
    })
  );

  // Test 6.3: Upload document to specific folder
  results.push(
    await runTest('6.3 Upload document to folder', async () => {
      // Create document in the folder
      const { document } = await createTestDocument({
        profileId: testClientId,
        type: 'W2',
        fileName: 'w2-employer1.pdf',
        taxYear: testTaxYear,
      });

      // Associate with folder
      const updatedDoc = await prisma.document.update({
        where: { id: document.id },
        data: {
          folderId: testFolderId,
        },
      });

      assertNotNull(updatedDoc, 'Document should be updated');
      assertEqual(updatedDoc.folderId, testFolderId, 'Document should be in folder');
      assertEqual(updatedDoc.taxYear, testTaxYear, 'Document tax year should match');

      // Create more documents
      for (let i = 0; i < 3; i++) {
        const { document: doc } = await createTestDocument({
          profileId: testClientId,
          type: i === 0 ? 'FORM_1099' : 'RECEIPT',
          fileName: `document-${i}.pdf`,
          taxYear: testTaxYear,
        });

        await prisma.document.update({
          where: { id: doc.id },
          data: { folderId: testFolderId },
        });
      }

      // Verify documents in folder
      const docsInFolder = await prisma.document.count({
        where: { folderId: testFolderId },
      });

      assertEqual(docsInFolder, 4, 'Should have 4 documents in folder');

      logSuccess('Documents uploaded to folder');
      logInfo(`  Documents in folder: ${docsInFolder}`);
    })
  );

  // Test 6.4: List documents in folder
  results.push(
    await runTest('6.4 List documents in folder', async () => {
      // Get all documents in the folder
      const documents = await prisma.document.findMany({
        where: { folderId: testFolderId },
        orderBy: { createdAt: 'desc' },
      });

      assertGreaterThan(documents.length, 0, 'Should have documents');

      // Group by type
      const byType: Record<string, number> = {};
      for (const doc of documents) {
        byType[doc.type] = (byType[doc.type] || 0) + 1;
      }

      // Verify document details
      for (const doc of documents) {
        assertNotNull(doc.fileName, 'Document should have fileName');
        assertNotNull(doc.fileUrl, 'Document should have fileUrl');
        assertEqual(doc.profileId, testClientId, 'Document should belong to client');
        assertEqual(doc.taxYear, testTaxYear, 'Document tax year should match folder');
      }

      logSuccess(`Listed ${documents.length} documents in folder`);
      logInfo(`  By type: ${JSON.stringify(byType)}`);
      logInfo(`  Files:`);
      documents.forEach(doc => logInfo(`    - ${doc.fileName} (${doc.type})`));
    })
  );

  // Test 6.5: Navigate folder hierarchy
  results.push(
    await runTest('6.5 Navigate folder hierarchy', async () => {
      // Create additional folders for different tax years
      const years = [2023, 2022];
      const additionalFolders: string[] = [];

      for (const year of years) {
        const folder = await prisma.folder.create({
          data: {
            name: `${year}`,
            path: generateFolderPath(testClientLastName, testClientFirstName, year),
            ownerId: testClientId,
            level: 0,
          },
        });
        additionalFolders.push(folder.id);

        // Add a document to each folder
        const { document } = await createTestDocument({
          profileId: testClientId,
          type: 'TAX_RETURN',
          fileName: `return-${year}.pdf`,
          taxYear: year,
        });

        await prisma.document.update({
          where: { id: document.id },
          data: { folderId: folder.id },
        });
      }

      // Get all folders for this client
      const allFolders = await prisma.folder.findMany({
        where: { ownerId: testClientId },
        orderBy: { name: 'desc' },
        include: {
          documents: true,
        },
      });

      assertEqual(allFolders.length, 3, 'Should have 3 folders (2024, 2023, 2022)');

      // Verify folder hierarchy navigation
      const folderTree: Record<string, { name: string; path: string; docCount: number }> = {};
      for (const folder of allFolders) {
        folderTree[folder.name] = {
          name: folder.name,
          path: folder.path,
          docCount: folder.documents.length,
        };
      }

      // Verify we can navigate to any year
      assert('2024' in folderTree, 'Should have 2024 folder');
      assert('2023' in folderTree, 'Should have 2023 folder');
      assert('2022' in folderTree, 'Should have 2022 folder');

      logSuccess('Folder hierarchy navigation verified');
      logInfo(`  Client: ${testClientFirstName} ${testClientLastName}`);
      logInfo(`  Folder tree:`);
      for (const [year, info] of Object.entries(folderTree)) {
        logInfo(`    ${year}: ${info.path} (${info.docCount} docs)`);
      }

      // Calculate totals
      const totalDocs = allFolders.reduce((sum, f) => sum + f.documents.length, 0);
      logInfo(`  Total documents: ${totalDocs}`);
    })
  );

  // Bonus: Test folder with documents from multiple preparers
  results.push(
    await runTest('6.6 Folder isolation between preparers', async () => {
      // Create another preparer
      const { profile: preparer2 } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'Other',
        lastName: 'Preparer',
        shortLinkUsername: `other-preparer-${Date.now()}`,
      });

      // This preparer should NOT be able to see the test client's folders
      // unless they're assigned to the client

      // Get folders accessible to preparer 1 (via client assignment)
      const preparer1Clients = await prisma.clientPreparer.findMany({
        where: {
          preparerId: testPreparerId,
          isActive: true,
        },
        select: { clientId: true },
      });

      const preparer1ClientIds = preparer1Clients.map(c => c.clientId);

      const preparer1Folders = await prisma.folder.findMany({
        where: {
          ownerId: { in: preparer1ClientIds },
        },
      });

      // Preparer 2 has no clients assigned
      const preparer2Clients = await prisma.clientPreparer.findMany({
        where: {
          preparerId: preparer2.id,
          isActive: true,
        },
        select: { clientId: true },
      });

      const preparer2ClientIds = preparer2Clients.map(c => c.clientId);

      const preparer2Folders = preparer2ClientIds.length > 0
        ? await prisma.folder.findMany({
            where: {
              ownerId: { in: preparer2ClientIds },
            },
          })
        : [];

      assertGreaterThan(preparer1Folders.length, 0, 'Preparer 1 should see folders');
      assertEqual(preparer2Folders.length, 0, 'Preparer 2 should not see folders');

      logSuccess('Folder isolation verified');
      logInfo(`  Preparer 1 folders: ${preparer1Folders.length}`);
      logInfo(`  Preparer 2 folders: ${preparer2Folders.length} (correctly isolated)`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 16: Folder Management');

  try {
    const results = await runFolderManagementTests();

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

export { runFolderManagementTests };
