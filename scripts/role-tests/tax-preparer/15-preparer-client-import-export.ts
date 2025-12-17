/**
 * Test 15: Tax Preparer Client Import/Export
 *
 * Validates CSV import and export functionality.
 *
 * Tests:
 * - 5.1: Export clients to CSV format
 * - 5.2: Verify CSV has correct columns
 * - 5.3: Import clients from CSV
 * - 5.4: Handle duplicate imports gracefully
 * - 5.5: Verify client-preparer assignments created
 */

import {
  prisma,
  createTestUser,
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

// CSV column definitions
const CSV_COLUMNS = ['firstName', 'lastName', 'email', 'phone', 'assignedAt'];

// Mock CSV generation
function generateCSV(clients: Array<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  assignedAt: Date;
}>): string {
  const header = CSV_COLUMNS.join(',');
  const rows = clients.map(c =>
    `${c.firstName},${c.lastName},${c.email},${c.phone},${c.assignedAt.toISOString()}`
  );
  return [header, ...rows].join('\n');
}

// Mock CSV parsing
function parseCSV(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split('\n');
  const header = lines[0].split(',');
  const data = lines.slice(1).map(line => {
    const values = line.split(',');
    const record: Record<string, string> = {};
    header.forEach((col, i) => {
      record[col] = values[i];
    });
    return record;
  });
  return data;
}

async function runClientImportExportTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  let testPreparerId: string;
  let testClientIds: string[] = [];
  let exportedCSV: string;

  // Setup: Create preparer with clients
  results.push(
    await runTest('Setup: Create preparer with clients', async () => {
      // Create test preparer
      const { profile: preparer } = await createTestUser({
        role: 'tax_preparer',
        firstName: 'ImportExport',
        lastName: 'Preparer',
        shortLinkUsername: `import-export-preparer-${Date.now()}`,
      });
      testPreparerId = preparer.id;

      // Create test clients
      const clientData = [
        { firstName: 'Alice', lastName: 'Smith', phone: '555-0001' },
        { firstName: 'Bob', lastName: 'Johnson', phone: '555-0002' },
        { firstName: 'Carol', lastName: 'Williams', phone: '555-0003' },
      ];

      for (const data of clientData) {
        const { profile: client } = await createTestUser({
          role: 'client',
          firstName: data.firstName,
          lastName: data.lastName,
          email: `${data.firstName.toLowerCase()}-${Date.now()}@test-taxgeniuspro.local`,
        });

        // Update phone
        await prisma.profile.update({
          where: { id: client.id },
          data: { phone: data.phone },
        });

        // Create assignment
        await createTestClientPreparerAssignment({
          preparerId: testPreparerId,
          clientId: client.id,
        });

        testClientIds.push(client.id);
      }

      logSuccess(`Created ${testClientIds.length} test clients for preparer`);
    })
  );

  // Test 5.1: Export clients to CSV format
  results.push(
    await runTest('5.1 Export clients to CSV format', async () => {
      // Get preparer's clients with assignments
      const assignments = await prisma.clientPreparer.findMany({
        where: {
          preparerId: testPreparerId,
          isActive: true,
        },
        include: {
          client: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { assignedAt: 'desc' },
      });

      assertEqual(assignments.length, 3, 'Should have 3 client assignments');

      // Generate CSV data
      const clients = assignments.map(a => ({
        firstName: a.client.firstName || '',
        lastName: a.client.lastName || '',
        email: a.client.user?.email || '',
        phone: a.client.phone || '',
        assignedAt: a.assignedAt,
      }));

      exportedCSV = generateCSV(clients);

      // Verify CSV structure
      const lines = exportedCSV.split('\n');
      assertGreaterThan(lines.length, 1, 'CSV should have header and data rows');
      assertEqual(lines[0], CSV_COLUMNS.join(','), 'CSV header should match expected columns');

      logSuccess('Clients exported to CSV');
      logInfo(`  Total clients: ${clients.length}`);
      logInfo(`  CSV size: ${exportedCSV.length} bytes`);
      logInfo(`  Preview:`);
      lines.slice(0, 3).forEach(line => logInfo(`    ${line}`));
    })
  );

  // Test 5.2: Verify CSV has correct columns
  results.push(
    await runTest('5.2 CSV has correct columns', async () => {
      const parsed = parseCSV(exportedCSV);

      assertEqual(parsed.length, 3, 'Should have 3 data rows');

      // Check each row has all columns
      for (const row of parsed) {
        for (const col of CSV_COLUMNS) {
          assert(col in row, `Row should have column: ${col}`);
          assertNotNull(row[col], `Column ${col} should have value`);
        }
      }

      // Verify specific data
      const firstRow = parsed[0];
      assert(firstRow.email.includes('@'), 'Email should be valid');
      assert(firstRow.phone.startsWith('555'), 'Phone should be valid');

      logSuccess('CSV columns verified');
      logInfo(`  Columns: ${CSV_COLUMNS.join(', ')}`);
      logInfo(`  Sample row: ${JSON.stringify(firstRow)}`);
    })
  );

  // Test 5.3: Import clients from CSV
  results.push(
    await runTest('5.3 Import clients from CSV', async () => {
      // Create import CSV with new clients
      const importData = [
        { firstName: 'David', lastName: 'Brown', email: `david-${Date.now()}@test-taxgeniuspro.local`, phone: '555-0004', assignedAt: new Date() },
        { firstName: 'Eve', lastName: 'Davis', email: `eve-${Date.now()}@test-taxgeniuspro.local`, phone: '555-0005', assignedAt: new Date() },
      ];

      const importCSV = generateCSV(importData);
      const parsed = parseCSV(importCSV);

      let importedCount = 0;
      const newClientIds: string[] = [];

      // Process import
      for (const row of parsed) {
        // Check if client exists
        const existingUser = await prisma.user.findUnique({
          where: { email: row.email },
        });

        let profileId: string;

        if (!existingUser) {
          // Create new user and profile
          const user = await prisma.user.create({
            data: {
              email: row.email,
              name: `${row.firstName} ${row.lastName}`,
            },
          });

          const profile = await prisma.profile.create({
            data: {
              userId: user.id,
              role: 'client',
              firstName: row.firstName,
              lastName: row.lastName,
              phone: row.phone,
              affiliateStatus: 'APPROVED', // Auto-approve imported clients
            },
          });

          profileId = profile.id;
          newClientIds.push(profileId);
          importedCount++;
        } else {
          // Get existing profile
          const profile = await prisma.profile.findFirst({
            where: { userId: existingUser.id },
          });
          profileId = profile!.id;
        }

        // Create client-preparer assignment
        await prisma.clientPreparer.upsert({
          where: {
            clientId_preparerId: {
              clientId: profileId,
              preparerId: testPreparerId,
            },
          },
          create: {
            clientId: profileId,
            preparerId: testPreparerId,
            isActive: true,
          },
          update: {
            isActive: true,
          },
        });
      }

      assertEqual(importedCount, 2, 'Should import 2 new clients');

      // Add to testClientIds for cleanup
      testClientIds.push(...newClientIds);

      logSuccess(`Imported ${importedCount} clients from CSV`);
      logInfo(`  New clients created: ${importedCount}`);
      logInfo(`  Assignments created: ${parsed.length}`);
    })
  );

  // Test 5.4: Handle duplicate imports gracefully
  results.push(
    await runTest('5.4 Handle duplicate imports gracefully', async () => {
      // Try to import the same data again
      const duplicateData = [
        { firstName: 'David', lastName: 'Brown', email: `david-duplicate@test-taxgeniuspro.local`, phone: '555-0004', assignedAt: new Date() },
      ];

      // First, create the client
      const { profile: existingClient } = await createTestUser({
        role: 'client',
        firstName: 'David',
        lastName: 'Brown',
        email: duplicateData[0].email,
      });

      // Create initial assignment
      await prisma.clientPreparer.create({
        data: {
          clientId: existingClient.id,
          preparerId: testPreparerId,
          isActive: true,
        },
      });

      // Try duplicate import
      const importCSV = generateCSV(duplicateData);
      const parsed = parseCSV(importCSV);

      let skippedCount = 0;
      let updatedCount = 0;

      for (const row of parsed) {
        const existingUser = await prisma.user.findUnique({
          where: { email: row.email },
          include: { profile: true },
        });

        if (existingUser) {
          // Client exists - upsert assignment
          const profile = existingUser.profile;
          if (profile) {
            const existingAssignment = await prisma.clientPreparer.findUnique({
              where: {
                clientId_preparerId: {
                  clientId: profile.id,
                  preparerId: testPreparerId,
                },
              },
            });

            if (existingAssignment) {
              skippedCount++;
            } else {
              // Create new assignment
              await prisma.clientPreparer.create({
                data: {
                  clientId: profile.id,
                  preparerId: testPreparerId,
                  isActive: true,
                },
              });
              updatedCount++;
            }
          }
        }
      }

      assertEqual(skippedCount, 1, 'Should skip 1 duplicate');

      testClientIds.push(existingClient.id);

      logSuccess('Duplicate imports handled gracefully');
      logInfo(`  Skipped (already assigned): ${skippedCount}`);
      logInfo(`  New assignments: ${updatedCount}`);
    })
  );

  // Test 5.5: Verify client-preparer assignments created
  results.push(
    await runTest('5.5 Client-preparer assignments verified', async () => {
      // Get all assignments for the preparer
      const assignments = await prisma.clientPreparer.findMany({
        where: {
          preparerId: testPreparerId,
          isActive: true,
        },
        include: {
          client: {
            include: {
              user: true,
            },
          },
        },
      });

      // Should have original 3 + 2 imported + 1 duplicate test = 6
      assertGreaterThan(assignments.length, 3, 'Should have more than original 3 assignments');

      // Verify each assignment has proper data
      for (const assignment of assignments) {
        assertNotNull(assignment.clientId, 'Assignment should have clientId');
        assertNotNull(assignment.preparerId, 'Assignment should have preparerId');
        assertEqual(assignment.isActive, true, 'Assignment should be active');
        assertNotNull(assignment.assignedAt, 'Assignment should have assignedAt');
        assertNotNull(assignment.client, 'Assignment should have client');
        assertNotNull(assignment.client.user, 'Client should have user');
      }

      // Verify no duplicate assignments
      const clientIdSet = new Set(assignments.map(a => a.clientId));
      assertEqual(clientIdSet.size, assignments.length, 'Should have no duplicate assignments');

      logSuccess('All client-preparer assignments verified');
      logInfo(`  Total assignments: ${assignments.length}`);
      logInfo(`  Unique clients: ${clientIdSet.size}`);
      logInfo(`  All active: Yes`);
    })
  );

  return results;
}

// Main execution
async function main() {
  logHeader('Test 15: Client Import/Export');

  try {
    const results = await runClientImportExportTests();

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

export { runClientImportExportTests };
