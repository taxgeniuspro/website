/**
 * Master Integration Test Runner
 *
 * Runs all integration tests across 7 phases.
 *
 * Usage:
 *   npx tsx scripts/role-tests/integration/run-integration-tests.ts           # Run all
 *   npx tsx scripts/role-tests/integration/run-integration-tests.ts phase1    # Run phase 1
 *   npx tsx scripts/role-tests/integration/run-integration-tests.ts phase7    # Run phase 7 E2E
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface PhaseResult {
  phase: string;
  tests: string[];
  passed: number;
  failed: number;
  duration: number;
  failedTests: string[];
}

const PHASES: Record<string, string[]> = {
  phase1: [
    '01-preparer-application-submit',
    '02-admin-review-application',
    '03-admin-approve-application',
    '04-preparer-setup-e2e',
  ],
  phase2: [
    '01-contact-form-lead',
    '02-tax-intake-lead',
  ],
  phase3: [
    '01-admin-view-leads',
    '02-admin-assign-lead',
    '03-lead-status-transitions',
  ],
  phase4: [
    '01-preparer-view-leads',
    '02-preparer-convert-lead',
  ],
  phase5: [
    '01-commission-calculation',
    '02-commission-approval',
  ],
  phase6: [
    '01-affiliate-auto-approval',
    '02-affiliate-referral-flow',
  ],
  phase7: [
    '01-full-e2e-workflow',
  ],
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message: string, color?: keyof typeof colors): void {
  if (color) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

async function runTest(testPath: string): Promise<{ passed: boolean; duration: number }> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const proc = spawn('npx', ['tsx', testPath], {
      stdio: 'inherit',
      shell: true,
    });

    proc.on('close', (code) => {
      resolve({
        passed: code === 0,
        duration: Date.now() - startTime,
      });
    });

    proc.on('error', () => {
      resolve({
        passed: false,
        duration: Date.now() - startTime,
      });
    });
  });
}

async function runPhase(phaseName: string, tests: string[]): Promise<PhaseResult> {
  const result: PhaseResult = {
    phase: phaseName,
    tests,
    passed: 0,
    failed: 0,
    duration: 0,
    failedTests: [],
  };

  const phaseDir = path.join(__dirname, phaseName);

  for (const test of tests) {
    const testPath = path.join(phaseDir, `${test}.ts`);

    // Check if test file exists
    if (!fs.existsSync(testPath)) {
      log(`  ⚠ Test file not found: ${test}`, 'yellow');
      continue;
    }

    console.log(`\n📋 Running: ${test}.ts\n`);

    const testResult = await runTest(testPath);
    result.duration += testResult.duration;

    if (testResult.passed) {
      result.passed++;
      log(`   ✓ PASS (${(testResult.duration / 1000).toFixed(1)}s)`, 'green');
    } else {
      result.failed++;
      result.failedTests.push(test);
      log(`   ✗ FAIL (${(testResult.duration / 1000).toFixed(1)}s)`, 'red');
    }
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const selectedPhase = args[0]?.toLowerCase();

  console.log('═'.repeat(60));
  log(' Cross-Role Integration Test Suite', 'bold');
  console.log('═'.repeat(60));
  console.log('');

  const results: PhaseResult[] = [];
  const phasesToRun = selectedPhase && PHASES[selectedPhase]
    ? { [selectedPhase]: PHASES[selectedPhase] }
    : PHASES;

  for (const [phaseName, tests] of Object.entries(phasesToRun)) {
    console.log('─'.repeat(60));
    log(` ${phaseName.toUpperCase()}`, 'cyan');
    console.log('─'.repeat(60));

    const result = await runPhase(phaseName, tests);
    results.push(result);
  }

  // Summary
  console.log('\n');
  console.log('═'.repeat(60));
  log(' Test Results Summary', 'bold');
  console.log('═'.repeat(60));
  console.log('');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalDuration = 0;

  for (const result of results) {
    const status = result.failed === 0 ? colors.green : colors.red;
    console.log(`  ${result.phase}: ${status}${result.passed}/${result.passed + result.failed}${colors.reset} (${(result.duration / 1000).toFixed(1)}s)`);

    if (result.failedTests.length > 0) {
      for (const test of result.failedTests) {
        log(`    - ${test}`, 'red');
      }
    }

    totalPassed += result.passed;
    totalFailed += result.failed;
    totalDuration += result.duration;
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`  Total: ${totalPassed}/${totalPassed + totalFailed} passed`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  if (totalFailed > 0) {
    log(`\n  ❌ ${totalFailed} test(s) failed`, 'red');
    process.exit(1);
  } else {
    log(`\n  ✅ All tests passed!`, 'green');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Runner error:', error);
  process.exit(1);
});
