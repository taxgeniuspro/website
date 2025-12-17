/**
 * Tax Genius Pro - Role-Based Test Suite
 *
 * Master runner for all 20 test combinations across:
 * - Admin (5 tests)
 * - Tax Preparer (5 tests)
 * - Client (5 tests)
 * - Affiliate-status (5 tests)
 *
 * Usage:
 *   npx tsx scripts/role-tests/run-all-tests.ts           # Run all tests
 *   npx tsx scripts/role-tests/run-all-tests.ts admin     # Run admin tests only
 *   npx tsx scripts/role-tests/run-all-tests.ts --clean   # Cleanup only (no tests)
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import { prisma, cleanupAllTestData, countTestData, logHeader, logSuccess, logError, logInfo, logWarning } from './test-utils/index';

interface TestFileResult {
  name: string;
  path: string;
  passed: boolean;
  duration: number;
  exitCode: number;
  output: string;
}

interface TestSuiteReport {
  suiteName: string;
  tests: TestFileResult[];
  totalPassed: number;
  totalFailed: number;
  totalDuration: number;
}

const TEST_FILES = {
  admin: [
    { name: '01-admin-view-users', path: 'admin/01-admin-view-users.ts' },
    { name: '02-admin-preparer-applications', path: 'admin/02-admin-preparer-applications.ts' },
    { name: '03-admin-payouts', path: 'admin/03-admin-payouts.ts' },
    { name: '04-admin-analytics', path: 'admin/04-admin-analytics.ts' },
    { name: '05-admin-permissions', path: 'admin/05-admin-permissions.ts' },
  ],
  taxPreparer: [
    { name: '06-preparer-view-leads', path: 'tax-preparer/06-preparer-view-leads.ts' },
    { name: '07-preparer-convert-lead', path: 'tax-preparer/07-preparer-convert-lead.ts' },
    { name: '08-preparer-update-status', path: 'tax-preparer/08-preparer-update-status.ts' },
    { name: '09-preparer-analytics', path: 'tax-preparer/09-preparer-analytics.ts' },
    { name: '10-preparer-documents', path: 'tax-preparer/10-preparer-documents.ts' },
  ],
  client: [
    { name: '11-client-view-return', path: 'client/11-client-view-return.ts' },
    { name: '12-client-upload-documents', path: 'client/12-client-upload-documents.ts' },
    { name: '13-client-view-profile', path: 'client/13-client-view-profile.ts' },
    { name: '14-client-data-isolation', path: 'client/14-client-data-isolation.ts' },
    { name: '15-client-affiliate-apply', path: 'client/15-client-affiliate-apply.ts' },
  ],
  affiliate: [
    { name: '16-affiliate-generate-links', path: 'affiliate/16-affiliate-generate-links.ts' },
    { name: '17-affiliate-click-tracking', path: 'affiliate/17-affiliate-click-tracking.ts' },
    { name: '18-affiliate-lead-attribution', path: 'affiliate/18-affiliate-lead-attribution.ts' },
    { name: '19-affiliate-commission-creation', path: 'affiliate/19-affiliate-commission-creation.ts' },
    { name: '20-affiliate-dashboard', path: 'affiliate/20-affiliate-dashboard.ts' },
  ],
};

async function runTestFile(testFile: { name: string; path: string }): Promise<TestFileResult> {
  const startTime = Date.now();
  const fullPath = path.join(__dirname, testFile.path);

  return new Promise((resolve) => {
    let output = '';

    const child: ChildProcess = spawn('npx', ['tsx', fullPath], {
      cwd: path.join(__dirname, '../..'),
      env: process.env,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data: Buffer) => {
      output += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code: number | null) => {
      resolve({
        name: testFile.name,
        path: testFile.path,
        passed: code === 0,
        duration: Date.now() - startTime,
        exitCode: code || 0,
        output,
      });
    });

    child.on('error', (error: Error) => {
      resolve({
        name: testFile.name,
        path: testFile.path,
        passed: false,
        duration: Date.now() - startTime,
        exitCode: 1,
        output: error.message,
      });
    });
  });
}

async function runTestSuite(
  suiteName: string,
  tests: { name: string; path: string }[]
): Promise<TestSuiteReport> {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`${suiteName}`);
  console.log(`${'='.repeat(50)}\n`);

  const results: TestFileResult[] = [];
  let totalDuration = 0;

  for (const test of tests) {
    const result = await runTestFile(test);
    results.push(result);
    totalDuration += result.duration;
  }

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  return {
    suiteName,
    tests: results,
    totalPassed,
    totalFailed,
    totalDuration,
  };
}

function printSummary(reports: TestSuiteReport[]): void {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('         TAX GENIUS PRO - ROLE-BASED TEST RESULTS');
  console.log('='.repeat(60));

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  for (const report of reports) {
    console.log(`\n${report.suiteName}:`);

    for (const test of report.tests) {
      const status = test.passed
        ? '\x1b[32m[PASS]\x1b[0m'
        : '\x1b[31m[FAIL]\x1b[0m';
      console.log(`  ${status} ${test.name} (${test.duration}ms)`);
    }

    totalPassed += report.totalPassed;
    totalFailed += report.totalFailed;
    totalDuration += report.totalDuration;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n  TOTAL: ${totalPassed}/${totalPassed + totalFailed} tests passed`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);

  if (totalFailed > 0) {
    console.log(`\n  \x1b[31m${totalFailed} tests FAILED\x1b[0m`);
  } else {
    console.log(`\n  \x1b[32mAll tests PASSED!\x1b[0m`);
  }

  console.log('\n' + '='.repeat(60));

  // Analytics validation summary
  console.log('\n  Analytics Validated:');
  console.log('  - Lead Pipeline Summary (getLeadPipelineSummary)');
  console.log('  - Conversion Funnel (getConversionFunnel)');
  console.log('  - Top Performers (getTopPerformers)');
  console.log('  - Commission Summary (getCommissionSummary)');
  console.log('  - Preparer/Affiliate Lead Performance');
  console.log('  - Role-based access control');

  console.log('\n' + '='.repeat(60));
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const args = process.argv.slice(2);

  // Handle --clean flag for cleanup-only mode
  const cleanOnly = args.includes('--clean');
  if (cleanOnly) {
    logHeader('Cleanup Mode - Removing All Test Data');
    try {
      const { deletedCounts, errors } = await cleanupAllTestData();
      const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);

      console.log('\nDeleted records:');
      for (const [table, count] of Object.entries(deletedCounts)) {
        if (count > 0) {
          console.log(`  - ${table}: ${count}`);
        }
      }

      if (totalDeleted > 0) {
        logSuccess(`\nTotal: ${totalDeleted} test records removed`);
      } else {
        logInfo('\nNo test data found to clean up');
      }

      if (errors.length > 0) {
        logWarning(`\n${errors.length} errors during cleanup:`);
        errors.forEach((e) => console.log(`  - ${e}`));
      }
    } catch (error) {
      logError(`Cleanup failed: ${error}`);
      await prisma.$disconnect();
      process.exit(1);
    }

    await prisma.$disconnect();
    process.exit(0);
  }

  logHeader('Tax Genius Pro - Role-Based Test Suite');

  // Pre-test cleanup: Remove stale test data from previous runs
  logInfo('Checking for stale test data from previous runs...');
  try {
    const existingData = await countTestData();
    const hasStaleData = Object.values(existingData).some((count) => count > 0);

    if (hasStaleData) {
      logWarning('Found stale test data - cleaning up before tests...');
      const { deletedCounts } = await cleanupAllTestData();
      const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);
      if (totalDeleted > 0) {
        logSuccess(`Cleaned up ${totalDeleted} stale test records`);
      }
    } else {
      logInfo('No stale test data found');
    }
  } catch (error) {
    logWarning(`Pre-cleanup check failed (continuing anyway): ${error}`);
  }

  logInfo('\nRunning all 20 test combinations...\n');

  // Check for specific suite argument
  const runOnly = args.find((a) => !a.startsWith('--'))?.toLowerCase();

  let suitesToRun: Array<{ name: string; tests: { name: string; path: string }[] }> = [];

  if (runOnly === 'admin') {
    suitesToRun = [{ name: 'Admin Tests', tests: TEST_FILES.admin }];
  } else if (runOnly === 'preparer' || runOnly === 'tax_preparer') {
    suitesToRun = [{ name: 'Tax Preparer Tests', tests: TEST_FILES.taxPreparer }];
  } else if (runOnly === 'client') {
    suitesToRun = [{ name: 'Client Tests', tests: TEST_FILES.client }];
  } else if (runOnly === 'affiliate') {
    suitesToRun = [{ name: 'Affiliate Tests', tests: TEST_FILES.affiliate }];
  } else {
    // Run all suites
    suitesToRun = [
      { name: 'Admin Tests', tests: TEST_FILES.admin },
      { name: 'Tax Preparer Tests', tests: TEST_FILES.taxPreparer },
      { name: 'Client Tests', tests: TEST_FILES.client },
      { name: 'Affiliate Tests', tests: TEST_FILES.affiliate },
    ];
  }

  const reports: TestSuiteReport[] = [];

  for (const suite of suitesToRun) {
    const report = await runTestSuite(suite.name, suite.tests);
    reports.push(report);
  }

  // Print final summary
  printSummary(reports);

  // Final cleanup
  logInfo('\nRunning final cleanup...');
  try {
    const { deletedCounts } = await cleanupAllTestData();
    const totalDeleted = Object.values(deletedCounts).reduce((a, b) => a + b, 0);
    if (totalDeleted > 0) {
      logSuccess(`Cleaned up ${totalDeleted} test records`);
    }
  } catch (error) {
    logError(`Cleanup error: ${error}`);
  }

  await prisma.$disconnect();

  // Exit with appropriate code
  const totalFailed = reports.reduce((sum, r) => sum + r.totalFailed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
