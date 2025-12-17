/**
 * Test 11: Client Can View Tax Return Status
 *
 * Validates that authenticated clients can view the status
 * of their own tax returns.
 *
 * Analytics Validated: Return status visibility
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

async function runClientViewReturnTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testClientId: string;
  let testReturnId: string;

  // Test 1: Client can view their tax return
  results.push(
    await runTest('Client can view own tax return', async () => {
      // Create test client
      const { profile: client } = await createTestUser({
        role: 'client',
        firstName: 'ViewReturn',
        lastName: 'Client',
      });
      testClientId = client.id;

      // Create tax return for client
      const { taxReturn } = await createTestTaxReturn({
        profileId: testClientId,
        status: 'IN_REVIEW',
        taxYear: 2024,
      });
      testReturnId = taxReturn.id;

      // Client fetches their return
      const clientReturn = await prisma.taxReturn.findFirst({
        where: {
          profileId: testClientId,
          id: testReturnId,
        },
      });

      assertNotNull(clientReturn, 'Client should be able to view their return');
      assertEqual(clientReturn.status, 'IN_REVIEW', 'Status should be IN_REVIEW');
      assertEqual(clientReturn.taxYear, 2024, 'Tax year should be 2024');

      logSuccess(`Client can view return ${testReturnId}`);
    })
  );

  // Test 2: Client can see return status details
  results.push(
    await runTest('Client sees status details', async () => {
      // Update return with more details
      const updatedReturn = await prisma.taxReturn.update({
        where: { id: testReturnId },
        data: {
          status: 'FILED',
          filedDate: new Date(),
          refundAmount: 3500,
        },
      });

      // Client views updated status
      const clientReturn = await prisma.taxReturn.findUnique({
        where: { id: testReturnId },
      });

      assertEqual(clientReturn?.status, 'FILED', 'Status should be FILED');
      assertNotNull(clientReturn?.filedDate, 'Filed date should be set');
      assertEqual(Number(clientReturn?.refundAmount), 3500, 'Refund amount should be $3500');

      logSuccess('Client can see status details: FILED with $3500 refund');
    })
  );

  // Test 3: Client can view multiple tax years
  results.push(
    await runTest('Client views multiple tax years', async () => {
      // Create returns for multiple years
      await createTestTaxReturn({
        profileId: testClientId,
        status: 'FILED',
        taxYear: 2023,
        refundAmount: 2800,
      });

      await createTestTaxReturn({
        profileId: testClientId,
        status: 'DRAFT',
        taxYear: 2022,
      });

      // Client fetches all their returns
      const allReturns = await prisma.taxReturn.findMany({
        where: { profileId: testClientId },
        orderBy: { taxYear: 'desc' },
      });

      assertEqual(allReturns.length, 3, 'Client should have 3 returns');

      // Verify years
      const years = allReturns.map((r) => r.taxYear);
      assertEqual(years[0], 2024, 'First return should be 2024');
      assertEqual(years[1], 2023, 'Second return should be 2023');
      assertEqual(years[2], 2022, 'Third return should be 2022');

      logSuccess(`Client has returns for years: ${years.join(', ')}`);
    })
  );

  // Test 4: Client sees correct status for each return
  results.push(
    await runTest('Each return has correct status', async () => {
      const returns = await prisma.taxReturn.findMany({
        where: { profileId: testClientId },
        orderBy: { taxYear: 'desc' },
      });

      const statusByYear: Record<number, string> = {};
      returns.forEach((r) => {
        statusByYear[r.taxYear] = r.status;
      });

      assertEqual(statusByYear[2024], 'FILED', '2024 should be FILED');
      assertEqual(statusByYear[2023], 'FILED', '2023 should be FILED');
      assertEqual(statusByYear[2022], 'DRAFT', '2022 should be DRAFT');

      logSuccess('Status by year verified');
      Object.entries(statusByYear).forEach(([year, status]) => {
        logInfo(`  ${year}: ${status}`);
      });
    })
  );

  // Test 5: Client return includes associated documents count
  results.push(
    await runTest('Return shows document count', async () => {
      // Add documents to the 2024 return
      for (let i = 0; i < 3; i++) {
        await prisma.document.create({
          data: {
            profileId: testClientId,
            taxReturnId: testReturnId,
            type: 'W2',
            fileName: `w2-document-${i}.pdf`,
            fileUrl: `https://test.storage/docs/${i}.pdf`,
            fileSize: 1024,
            mimeType: 'application/pdf',
            status: 'REVIEWED',
            taxYear: 2024,
          },
        });
      }

      // Get return with document count
      const returnWithDocs = await prisma.taxReturn.findUnique({
        where: { id: testReturnId },
        include: {
          documents: true,
        },
      });

      assertNotNull(returnWithDocs, 'Return should exist');
      assertEqual(returnWithDocs.documents.length, 3, 'Should have 3 documents');

      logSuccess(`Return has ${returnWithDocs.documents.length} documents attached`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 11: Client View Return');

  try {
    const results = await runClientViewReturnTest();

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

export { runClientViewReturnTest };
