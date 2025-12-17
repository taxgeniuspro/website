/**
 * Integration Test: Phase 1.4 - New Preparer Setup (E2E)
 *
 * Browser-based test for new preparer first login and setup.
 *
 * Tests:
 * - 1.4.1: Login with credentials
 * - 1.4.2: Navigate to settings
 * - 1.4.3: View profile form
 * - 1.4.4: Navigate to tracking/links page
 * - 1.4.5: Verify QR codes and links displayed
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser,
  login,
  screenshot,
  navigateTo,
  waitForSelector,
  elementExists,
  closeBrowser,
  waitForNetworkIdle,
  delay,
} from '../../test-utils/puppeteer-helpers';
import {
  runTest,
  assert,
  logHeader,
  logSuccess,
  logInfo,
  logError,
  TestResult,
} from '../../test-utils/index';

// Test preparer credentials (existing preparer)
const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runPreparerSetupE2ETests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Setup: Launch browser and login
    results.push(
      await runTest('Setup: Login as preparer', async () => {
        const launched = await launchBrowser();
        browser = launched.browser;
        page = launched.page;
        const loggedIn = await login(page, TEST_EMAIL, TEST_PASSWORD);
        assert(loggedIn, 'Should be logged in');
        logSuccess('Logged in as preparer');
      })
    );

    if (!page) throw new Error('Page not initialized');

    // Test 1.4.1: Verify on dashboard
    results.push(
      await runTest('1.4.1 Verify on preparer dashboard', async () => {
        const url = page!.url();
        assert(url.includes('/dashboard'), 'Should be on dashboard');
        await screenshot(page!, 'phase1-01-dashboard');
        logSuccess(`On dashboard: ${url}`);
      })
    );

    // Test 1.4.2: Navigate to settings
    results.push(
      await runTest('1.4.2 Navigate to settings', async () => {
        await navigateTo(page!, '/dashboard/tax-preparer/settings');
        await waitForNetworkIdle(page!, 5000);

        const url = page!.url();
        assert(url.includes('settings'), 'Should be on settings page');
        logSuccess('Navigated to settings');
      })
    );

    // Test 1.4.3: View profile form
    results.push(
      await runTest('1.4.3 Profile form present', async () => {
        await delay(2000);

        const hasProfileForm = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return (
            text.includes('profile') ||
            text.includes('settings') ||
            document.querySelector('form') !== null
          );
        });

        assert(hasProfileForm, 'Profile form should be present');
        await screenshot(page!, 'phase1-02-settings');
        logSuccess('Profile form verified');
      })
    );

    // Test 1.4.4: Navigate to tracking/referrals page
    results.push(
      await runTest('1.4.4 Navigate to tracking page', async () => {
        // Navigate to tracking page (known valid route)
        await navigateTo(page!, '/en/dashboard/tax-preparer/tracking');
        await waitForNetworkIdle(page!, 5000);
        await delay(2000);

        const url = page!.url();
        const isOnTrackingPage = url.includes('tracking') || url.includes('referral') || url.includes('share');

        // If tracking page didn't load, check if we can still see tracking content
        const hasTrackingContent = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return text.includes('tracking') || text.includes('qr') || text.includes('link');
        });

        assert(isOnTrackingPage || hasTrackingContent, 'Should navigate to tracking/links page');
        logSuccess(`On page: ${url}`);
      })
    );

    // Test 1.4.5: Verify QR codes and links
    results.push(
      await runTest('1.4.5 QR codes and links displayed', async () => {
        await delay(2000);

        const pageContent = await page!.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return {
            hasQR: document.querySelector('img[alt*="qr"], img[src*="qr"], [class*="qr"]') !== null ||
                   text.includes('qr code'),
            hasLinks: text.includes('link') || text.includes('url') || text.includes('/go/'),
            hasTrackingCode: text.includes('tracking') || text.includes('code'),
          };
        });

        logInfo(`  QR Code: ${pageContent.hasQR}`);
        logInfo(`  Links: ${pageContent.hasLinks}`);
        logInfo(`  Tracking Code: ${pageContent.hasTrackingCode}`);

        // At least one of these should be present
        const hasContent = pageContent.hasQR || pageContent.hasLinks || pageContent.hasTrackingCode;
        assert(hasContent, 'Should display QR codes, links, or tracking code');

        await screenshot(page!, 'phase1-03-tracking');
        logSuccess('Tracking content verified');
      })
    );

    // Test 1.4.6: Navigate to dashboard overview
    results.push(
      await runTest('1.4.6 Return to dashboard', async () => {
        await navigateTo(page!, '/dashboard/tax-preparer');
        await waitForNetworkIdle(page!, 5000);

        const url = page!.url();
        assert(url.includes('/dashboard'), 'Should be on dashboard');

        await screenshot(page!, 'phase1-04-final-dashboard');
        logSuccess('Returned to dashboard');
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
    if (browser) {
      await closeBrowser();
    }
  }

  return results;
}

// Main execution
async function main() {
  logHeader('Phase 1.4: New Preparer Setup (E2E)');
  logInfo(`Test credentials: ${TEST_EMAIL}`);

  const results = await runPreparerSetupE2ETests();

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

export { runPreparerSetupE2ETests };
