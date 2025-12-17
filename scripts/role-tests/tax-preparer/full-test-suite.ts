/**
 * Tax Preparer Full Test Suite
 *
 * Master orchestrator for all tax preparer tests.
 *
 * Phases:
 * - Phase 1: Database/Unit Tests (Steps 1-6)
 * - Phase 2: API Tests (Steps 7-9)
 * - Phase 3: E2E Browser Tests (Steps 10-18)
 *
 * Run: npx tsx scripts/role-tests/tax-preparer/full-test-suite.ts
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { cleanupAllTestData, prisma } from '../test-utils/index';

// Test files organized by phase
const PHASE_1_TESTS = [
  '11-preparer-lead-lifecycle.ts',
  '12-preparer-unqualify-reopen.ts',
  '13-preparer-commission-calculation.ts',
  '14-preparer-payout-workflow.ts',
  '15-preparer-client-import-export.ts',
  '16-preparer-folder-management.ts',
];

const PHASE_2_TESTS = [
  'api-01-leads.ts',
  'api-02-clients-docs.ts',
  'api-03-commissions.ts',
];

const PHASE_3_TESTS = [
  'e2e-01-login.ts',
  'e2e-02-dashboard.ts',
  'e2e-03-leads.ts',
  'e2e-04-clients.ts',
  'e2e-05-documents.ts',
  'e2e-06-referrals.ts',
  'e2e-07-commissions.ts',
  'e2e-08-settings.ts',
  'e2e-09-full-workflow.ts',
];

interface TestResult {
  file: string;
  passed: boolean;
  duration: number;
  output: string;
}

interface PhaseResult {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

const TEST_DIR = path.join(process.cwd(), 'scripts', 'role-tests', 'tax-preparer');
const RESULTS_DIR = path.join(process.cwd(), 'test-results', 'tax-preparer-e2e');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

function logHeader(message: string): void {
  console.log('\n' + '═'.repeat(60));
  log(` ${message}`, 'bold');
  console.log('═'.repeat(60));
}

function logPhase(phase: string): void {
  console.log('\n' + '─'.repeat(60));
  log(` ${phase}`, 'cyan');
  console.log('─'.repeat(60));
}

async function runTest(file: string): Promise<TestResult> {
  const startTime = Date.now();
  const filePath = path.join(TEST_DIR, file);

  return new Promise((resolve) => {
    let output = '';

    const child: ChildProcess = spawn('npx', ['tsx', filePath], {
      cwd: process.cwd(),
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({
        file,
        passed: code === 0,
        duration: Date.now() - startTime,
        output,
      });
    });

    child.on('error', (error) => {
      resolve({
        file,
        passed: false,
        duration: Date.now() - startTime,
        output: `Error: ${error.message}`,
      });
    });
  });
}

async function runPhase(name: string, tests: string[]): Promise<PhaseResult> {
  logPhase(name);

  const results: TestResult[] = [];
  const startTime = Date.now();

  for (const test of tests) {
    console.log(`\n📋 Running: ${test}`);
    const result = await runTest(test);
    results.push(result);

    const status = result.passed
      ? `${colors.green}✓ PASS${colors.reset}`
      : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`   ${status} (${result.duration}ms)`);
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    name,
    tests: results,
    passed,
    failed,
    duration: Date.now() - startTime,
  };
}

function generateHTMLReport(phases: PhaseResult[]): void {
  const totalPassed = phases.reduce((sum, p) => sum + p.passed, 0);
  const totalFailed = phases.reduce((sum, p) => sum + p.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const totalDuration = phases.reduce((sum, p) => sum + p.duration, 0);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Preparer E2E Test Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; }
    .summary { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .summary-stats { display: flex; gap: 20px; margin-top: 15px; }
    .stat { padding: 15px 25px; border-radius: 6px; }
    .stat-passed { background: #d4edda; color: #155724; }
    .stat-failed { background: #f8d7da; color: #721c24; }
    .stat-total { background: #e2e3e5; color: #383d41; }
    .stat-time { background: #cce5ff; color: #004085; }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; text-transform: uppercase; }
    .phase { background: white; padding: 20px; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .phase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .phase-title { font-size: 18px; font-weight: 600; color: #333; }
    .phase-stats { font-size: 14px; color: #666; }
    .test { display: flex; justify-content: space-between; padding: 10px 15px; border-radius: 4px; margin-bottom: 5px; }
    .test-pass { background: #d4edda; }
    .test-fail { background: #f8d7da; }
    .test-name { font-family: monospace; }
    .test-duration { color: #666; font-size: 13px; }
    .screenshots { margin-top: 30px; }
    .screenshot-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-top: 15px; }
    .screenshot-item { background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .screenshot-item img { width: 100%; border-radius: 4px; }
    .screenshot-item p { margin: 10px 0 0; font-size: 13px; color: #666; }
    .timestamp { color: #999; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🧪 Tax Preparer E2E Test Report</h1>

    <div class="summary">
      <h2>Summary</h2>
      <div class="summary-stats">
        <div class="stat stat-passed">
          <div class="stat-value">${totalPassed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat stat-failed">
          <div class="stat-value">${totalFailed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat stat-total">
          <div class="stat-value">${totalTests}</div>
          <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat stat-time">
          <div class="stat-value">${(totalDuration / 1000).toFixed(1)}s</div>
          <div class="stat-label">Duration</div>
        </div>
      </div>
    </div>

    ${phases
      .map(
        (phase) => `
    <div class="phase">
      <div class="phase-header">
        <span class="phase-title">${phase.name}</span>
        <span class="phase-stats">${phase.passed}/${phase.tests.length} passed (${(phase.duration / 1000).toFixed(1)}s)</span>
      </div>
      ${phase.tests
        .map(
          (test) => `
      <div class="test ${test.passed ? 'test-pass' : 'test-fail'}">
        <span class="test-name">${test.passed ? '✓' : '✗'} ${test.file}</span>
        <span class="test-duration">${test.duration}ms</span>
      </div>`
        )
        .join('')}
    </div>`
      )
      .join('')}

    <div class="screenshots">
      <h2>📸 Screenshots</h2>
      <div class="screenshot-grid" id="screenshots"></div>
    </div>

    <p class="timestamp">Generated: ${new Date().toISOString()}</p>
  </div>

  <script>
    // Load screenshots
    const screenshotDir = './screenshots/';
    const screenshots = ${JSON.stringify(fs.readdirSync(path.join(RESULTS_DIR, 'screenshots')).filter(f => f.endsWith('.png')))};
    const container = document.getElementById('screenshots');

    screenshots.forEach(filename => {
      const item = document.createElement('div');
      item.className = 'screenshot-item';
      item.innerHTML = \`
        <img src="screenshots/\${filename}" alt="\${filename}">
        <p>\${filename}</p>
      \`;
      container.appendChild(item);
    });
  </script>
</body>
</html>`;

  const reportPath = path.join(RESULTS_DIR, 'report.html');
  fs.writeFileSync(reportPath, html);
  log(`\n📊 HTML Report: ${reportPath}`, 'cyan');
}

function generateJSONReport(phases: PhaseResult[]): void {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: phases.reduce((sum, p) => sum + p.tests.length, 0),
      passed: phases.reduce((sum, p) => sum + p.passed, 0),
      failed: phases.reduce((sum, p) => sum + p.failed, 0),
      duration: phases.reduce((sum, p) => sum + p.duration, 0),
    },
    phases: phases.map((p) => ({
      name: p.name,
      passed: p.passed,
      failed: p.failed,
      duration: p.duration,
      tests: p.tests.map((t) => ({
        file: t.file,
        passed: t.passed,
        duration: t.duration,
      })),
    })),
  };

  const reportPath = path.join(RESULTS_DIR, 'results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`📄 JSON Report: ${reportPath}`, 'cyan');
}

async function main() {
  logHeader('Tax Preparer Full Test Suite');
  console.log(`\nRunning ${PHASE_1_TESTS.length + PHASE_2_TESTS.length + PHASE_3_TESTS.length} test files`);
  console.log(`Results will be saved to: ${RESULTS_DIR}\n`);

  const startTime = Date.now();
  const phases: PhaseResult[] = [];

  // Ensure screenshots directory exists
  const screenshotsDir = path.join(RESULTS_DIR, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Run Phase 1: Database Tests
  phases.push(await runPhase('Phase 1: Database/Unit Tests', PHASE_1_TESTS));

  // Run Phase 2: API Tests
  phases.push(await runPhase('Phase 2: API Endpoint Tests', PHASE_2_TESTS));

  // Run Phase 3: E2E Tests
  phases.push(await runPhase('Phase 3: E2E Browser Tests', PHASE_3_TESTS));

  // Generate reports
  logHeader('Test Results Summary');

  const totalPassed = phases.reduce((sum, p) => sum + p.passed, 0);
  const totalFailed = phases.reduce((sum, p) => sum + p.failed, 0);
  const totalTests = totalPassed + totalFailed;
  const totalDuration = Date.now() - startTime;

  console.log('\n');
  for (const phase of phases) {
    const status = phase.failed === 0 ? colors.green : colors.red;
    console.log(`  ${phase.name}: ${status}${phase.passed}/${phase.tests.length}${colors.reset} (${(phase.duration / 1000).toFixed(1)}s)`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`  Total: ${totalPassed}/${totalTests} passed`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);

  if (totalFailed > 0) {
    log(`\n  ❌ ${totalFailed} test file(s) failed`, 'red');

    console.log('\n  Failed tests:');
    for (const phase of phases) {
      for (const test of phase.tests) {
        if (!test.passed) {
          console.log(`    - ${test.file}`);
        }
      }
    }
  } else {
    log('\n  ✅ All tests passed!', 'green');
  }

  // Generate reports
  try {
    generateHTMLReport(phases);
    generateJSONReport(phases);
  } catch (e) {
    log(`\nWarning: Could not generate reports: ${e}`, 'yellow');
  }

  // Cleanup test data
  console.log('\n🧹 Cleaning up test data...');
  try {
    await cleanupAllTestData();
    console.log('   Done');
  } catch (e) {
    console.log(`   Warning: Cleanup error: ${e}`);
  }

  await prisma.$disconnect();

  console.log('\n' + '═'.repeat(60) + '\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(async (error) => {
  console.error('Fatal error:', error);
  await prisma.$disconnect();
  process.exit(1);
});
