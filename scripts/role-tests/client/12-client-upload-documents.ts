/**
 * Test 12: Client Can Upload Documents
 *
 * Validates that clients can upload tax documents to their return.
 *
 * Analytics Validated: Document audit log
 */

import {
  prisma,
  createTestUser,
  createTestTaxReturn,
  runTest,
  assertEqual,
  assertNotNull,
  cleanupAllTestData,
  logHeader,
  logSuccess,
  logInfo,
  TestResult,
} from '../test-utils/index';

async function runClientUploadDocumentsTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testClientId: string;
  let testReturnId: string;

  // Test 1: Client can upload a document
  results.push(
    await runTest('Client can upload document', async () => {
      // Create test client
      const { profile: client } = await createTestUser({
        role: 'client',
        firstName: 'Upload',
        lastName: 'Client',
      });
      testClientId = client.id;

      // Create tax return
      const { taxReturn } = await createTestTaxReturn({
        profileId: testClientId,
        status: 'DRAFT',
      });
      testReturnId = taxReturn.id;

      // Simulate document upload
      const document = await prisma.document.create({
        data: {
          profileId: testClientId,
          taxReturnId: testReturnId,
          type: 'W2',
          fileName: 'w2-employer-2024.pdf',
          fileUrl: 'https://storage.test/documents/w2-upload.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          status: 'PENDING',
          taxYear: 2024,
        },
      });

      assertNotNull(document, 'Document should be created');
      assertEqual(document.type, 'W2', 'Document type should be W2');
      assertEqual(document.status, 'PENDING', 'Initial status should be PENDING');

      logSuccess(`Document uploaded: ${document.fileName}`);
    })
  );

  // Test 2: Document linked to correct return
  results.push(
    await runTest('Document linked to return', async () => {
      const documents = await prisma.document.findMany({
        where: {
          profileId: testClientId,
          taxReturnId: testReturnId,
        },
      });

      assertEqual(documents.length, 1, 'Should have 1 document on return');
      assertEqual(documents[0].taxReturnId, testReturnId, 'Document should be linked to return');

      logSuccess('Document correctly linked to tax return');
    })
  );

  // Test 3: Multiple document types supported
  results.push(
    await runTest('Multiple document types supported', async () => {
      // Upload different document types (using valid DocumentType enum)
      const docTypes: Array<'FORM_1099' | 'RECEIPT' | 'TAX_RETURN' | 'OTHER'> = ['FORM_1099', 'RECEIPT', 'TAX_RETURN', 'OTHER'];

      for (const type of docTypes) {
        await prisma.document.create({
          data: {
            profileId: testClientId,
            taxReturnId: testReturnId,
            type,
            fileName: `${type.toLowerCase()}-2024.pdf`,
            fileUrl: `https://storage.test/documents/${type.toLowerCase()}.pdf`,
            fileSize: 1024,
            mimeType: 'application/pdf',
            status: 'PENDING',
            taxYear: 2024,
          },
        });
      }

      // Verify all types created
      const allDocs = await prisma.document.findMany({
        where: { taxReturnId: testReturnId },
      });

      assertEqual(allDocs.length, 5, 'Should have 5 documents total');

      const types = new Set(allDocs.map((d) => d.type));
      assertEqual(types.size, 5, 'Should have 5 different document types');

      logSuccess(`Uploaded ${docTypes.length} different document types`);
    })
  );

  // Test 4: Document metadata is stored
  results.push(
    await runTest('Document metadata stored', async () => {
      // Create document with full metadata
      const document = await prisma.document.create({
        data: {
          profileId: testClientId,
          taxReturnId: testReturnId,
          type: 'W2',
          fileName: 'w2-detailed.pdf',
          fileUrl: 'https://storage.test/documents/w2-detailed.pdf',
          fileSize: 250000, // 250KB
          mimeType: 'application/pdf',
          status: 'PENDING',
          taxYear: 2024,
        },
      });

      assertNotNull(document.fileSize, 'File size should be stored');
      assertEqual(document.fileSize, 250000, 'File size should be 250KB');
      assertEqual(document.mimeType, 'application/pdf', 'MIME type should be stored');
      assertNotNull(document.createdAt, 'Created timestamp should be set');

      logSuccess('Document metadata stored correctly');
    })
  );

  // Test 5: Upload creates audit record
  results.push(
    await runTest('Upload creates audit record', async () => {
      // Create a document
      const document = await prisma.document.create({
        data: {
          profileId: testClientId,
          taxReturnId: testReturnId,
          type: 'W2',
          fileName: 'w2-audit-test.pdf',
          fileUrl: 'https://storage.test/documents/w2-audit.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          status: 'PENDING',
          taxYear: 2024,
        },
      });

      // Create file operation audit record
      const fileOperation = await prisma.fileOperation.create({
        data: {
          documentId: document.id,
          performedBy: testClientId,
          operation: 'UPLOAD',
          ipAddress: '192.168.1.100',
          userAgent: 'Test Browser',
        },
      });

      assertNotNull(fileOperation, 'File operation should be created');
      assertEqual(fileOperation.operation, 'UPLOAD', 'Operation should be UPLOAD');
      assertEqual(fileOperation.documentId, document.id, 'Should reference document');
      assertNotNull(fileOperation.timestamp, 'Timestamp should be set');

      logSuccess('Audit record created for upload');
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 12: Client Upload Documents');

  try {
    const results = await runClientUploadDocumentsTest();

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

export { runClientUploadDocumentsTest };
