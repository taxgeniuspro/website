/**
 * Test Utils Index
 *
 * Central export for all test utilities.
 */

export * from './test-data-factory';
export * from './session-helpers';
export * from './analytics-validators';
export * from './cleanup';

// Test result types
export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  duration: number;
  tests: TestResult[];
}

// Test runner helper
export async function runTest(
  testName: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    await testFn();
    return {
      testName,
      passed: true,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Assert helpers
export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

export function assertNotNull<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${message}: expected non-null value`);
  }
}

export function assertGreaterThan(actual: number, expected: number, message: string): void {
  if (actual <= expected) {
    throw new Error(`${message}: expected > ${expected}, got ${actual}`);
  }
}

export function assertGreaterThanOrEqual(actual: number, expected: number, message: string): void {
  if (actual < expected) {
    throw new Error(`${message}: expected >= ${expected}, got ${actual}`);
  }
}

/**
 * Compare Decimal values (Prisma returns Decimal objects, not numbers)
 * Use this for fields marked with @db.Decimal() in Prisma schema
 */
export function assertDecimalEqual(
  actual: unknown,
  expected: number,
  message: string
): void {
  const actualNum = typeof actual === 'number' ? actual : Number(actual);
  if (actualNum !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actualNum}`);
  }
}

/**
 * Convert Prisma Decimal to JavaScript number
 * Safe to use with null/undefined values
 */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

// Print test results
export function printTestResult(result: TestResult): void {
  const status = result.passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`  ${status} ${result.testName} (${result.duration}ms)`);
  if (!result.passed && result.error) {
    console.log(`         Error: ${result.error}`);
  }
}

export function printSuiteResult(result: TestSuiteResult): void {
  console.log(`\n${result.suiteName}`);
  console.log('─'.repeat(50));

  result.tests.forEach(printTestResult);

  console.log('─'.repeat(50));
  console.log(
    `  ${result.passed}/${result.totalTests} passed (${result.duration}ms)`
  );

  if (result.failed > 0) {
    console.log(`  \x1b[31m${result.failed} tests failed\x1b[0m`);
  }
}

// Console formatting helpers
export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

export function log(message: string, color?: keyof typeof colors): void {
  if (color) {
    console.log(`${colors[color]}${message}${colors.reset}`);
  } else {
    console.log(message);
  }
}

export function logSuccess(message: string): void {
  log(`✓ ${message}`, 'green');
}

export function logError(message: string): void {
  log(`✗ ${message}`, 'red');
}

export function logInfo(message: string): void {
  log(`ℹ ${message}`, 'cyan');
}

export function logWarning(message: string): void {
  log(`⚠ ${message}`, 'yellow');
}

export function logHeader(message: string): void {
  console.log('\n' + '='.repeat(50));
  log(message, 'bold');
  console.log('='.repeat(50));
}
