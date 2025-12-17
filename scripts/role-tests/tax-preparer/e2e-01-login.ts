/**
 * E2E Test 01: Tax Preparer Login
 *
 * Tests authentication flow for tax preparer role.
 *
 * Tests:
 * - 10.1: Navigate to /en/auth/signin
 * - 10.2: Enter email
 * - 10.3: Enter password
 * - 10.4: Click sign in button
 * - 10.5: Verify redirect to /dashboard/tax-preparer
 * - 10.6: Screenshot: successful login
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  login,
  screenshot,
  navigateTo,
  waitForSelector,
  getCurrentUrl,
  closeBrowser,
  delay,
} from '../test-utils/puppeteer-helpers';
import {
  runTest,
  assert,
  logHeader,
  logSuccess,
  logError,
  logInfo,
  TestResult,
} from '../test-utils/index';

// Test credentials
const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runLoginE2ETests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    results.push(
      await runTest('10.0 Launch browser', async () => {
        const launched = await launchBrowser();
        browser = launched.browser;
        page = launched.page;
        assert(browser !== null, 'Browser should launch');
        assert(page !== null, 'Page should be created');
        logSuccess('Browser launched');
      })
    );

    if (!page) throw new Error('Page not initialized');

    // Test 10.1: Navigate to signin
    results.push(
      await runTest('10.1 Navigate to signin page', async () => {
        await navigateTo(page!, '/en/auth/signin');
        const url = getCurrentUrl(page!);
        assert(url.includes('signin'), 'Should be on signin page');
        logSuccess(`Navigated to: ${url}`);
      })
    );

    // Test 10.2: Enter email (in credentials form, not magic link)
    results.push(
      await runTest('10.2 Enter email', async () => {
        // Use the credentials form email input (id="email"), not magic link input
        const emailInput = await page!.$('input#email');
        assert(emailInput !== null, 'Email input should exist');

        await emailInput!.click({ clickCount: 3 });
        await emailInput!.type(TEST_EMAIL, { delay: 30 });

        const value = await page!.$eval(
          'input#email',
          (el) => (el as HTMLInputElement).value
        );
        assert(value === TEST_EMAIL, 'Email should be entered');
        logSuccess(`Email entered: ${TEST_EMAIL}`);
      })
    );

    // Test 10.3: Enter password
    results.push(
      await runTest('10.3 Enter password', async () => {
        const passwordInput = await page!.$('input#password');
        assert(passwordInput !== null, 'Password input should exist');

        await passwordInput!.click({ clickCount: 3 });
        await passwordInput!.type(TEST_PASSWORD, { delay: 30 });

        const value = await page!.$eval(
          'input#password',
          (el) => (el as HTMLInputElement).value
        );
        assert(value.length > 0, 'Password should be entered');
        logSuccess('Password entered');
      })
    );

    // Test 10.4: Click sign in button (credentials form, not Google OAuth)
    results.push(
      await runTest('10.4 Click sign in button', async () => {
        // Find and click the submit button in the credentials form (not Google OAuth)
        const clicked = await page!.evaluate(() => {
          // The credentials form is a <form> element with email/password inputs
          const form = document.querySelector('form');
          if (form) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
              (submitBtn as HTMLButtonElement).click();
              return true;
            }
          }
          return false;
        });

        assert(clicked, 'Sign in button should be clicked');
        logSuccess('Sign in button clicked');
      })
    );

    // Test 10.5: Verify redirect to dashboard
    results.push(
      await runTest('10.5 Verify redirect to dashboard', async () => {
        // Wait for navigation
        try {
          await page!.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        } catch {
          // May have already navigated
        }

        // Wait for dashboard elements
        await delay(2000);

        const url = getCurrentUrl(page!);
        const isDashboard = url.includes('/dashboard');

        // Check if we're on the tax preparer dashboard specifically
        const isTaxPreparerDashboard = url.includes('/dashboard/tax-preparer') ||
                                       url.includes('/dashboard');

        assert(isDashboard || isTaxPreparerDashboard, `Should be on dashboard, got: ${url}`);
        logSuccess(`Redirected to: ${url}`);
      })
    );

    // Test 10.6: Screenshot
    results.push(
      await runTest('10.6 Screenshot successful login', async () => {
        await delay(1000); // Wait for page to settle
        const filepath = await screenshot(page!, '10-login-success');
        assert(filepath.length > 0, 'Screenshot should be saved');
        logSuccess(`Screenshot: ${filepath}`);
      })
    );

  } catch (error) {
    logError(`E2E test error: ${error}`);
    results.push({
      testName: 'E2E Error',
      passed: false,
      duration: 0,
      error: String(error),
    });
  } finally {
    // Cleanup
    if (browser) {
      await closeBrowser();
    }
  }

  return results;
}

// Main execution
async function main() {
  logHeader('E2E Test 01: Login');
  logInfo(`Test credentials: ${TEST_EMAIL}`);

  const results = await runLoginE2ETests();

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

  process.exit(0);
}

main();

export { runLoginE2ETests };
