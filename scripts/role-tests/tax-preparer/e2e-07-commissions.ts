/**
 * E2E Test 07: Tax Preparer Commission Settings & Payouts
 *
 * Tests commission settings and payout obligations pages.
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser, login, screenshot, navigateTo,
  elementExists, clickButton, closeBrowser, waitForNetworkIdle,
} from '../test-utils/puppeteer-helpers';
import { runTest, assert, logHeader, logSuccess, logInfo, TestResult } from '../test-utils/index';

const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runCommissionsPageE2ETests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    results.push(await runTest('Setup: Login', async () => {
      const launched = await launchBrowser();
      browser = launched.browser;
      page = launched.page;
      const loggedIn = await login(page, TEST_EMAIL, TEST_PASSWORD);
      assert(loggedIn, 'Should be logged in');
    }));

    if (!page) throw new Error('Page not initialized');

    results.push(await runTest('16.1 Navigate to commission settings', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/commission-settings');
      await waitForNetworkIdle(page!, 5000);
      logSuccess('Navigated to commission settings');
    }));

    results.push(await runTest('16.2 Tier structure displayed', async () => {
      const hasTiers = await page!.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('tier') || text.includes('rate') || text.includes('commission');
      });
      assert(hasTiers, 'Should show tier/rate info');
      logSuccess('Tier structure present');
    }));

    results.push(await runTest('16.3 Screenshot commission settings', async () => {
      const filepath = await screenshot(page!, '16-commission-settings', true);
      assert(filepath.length > 0, 'Screenshot saved');
    }));

    results.push(await runTest('16.4 Navigate to payout obligations', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/payout-obligations');
      await waitForNetworkIdle(page!, 5000);
      logSuccess('Navigated to payout obligations');
    }));

    results.push(await runTest('16.5 Obligations list loads', async () => {
      const hasData = await page!.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('pending') || text.includes('approved') || text.includes('paid') || text.includes('no obligations');
      });
      assert(hasData, 'Should show obligations or empty state');
      logSuccess('Obligations data present');
    }));

    results.push(await runTest('16.6 Mark Paid button check', async () => {
      const hasMarkPaid = await page!.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b => b.textContent?.toLowerCase().includes('mark') && b.textContent?.toLowerCase().includes('paid'));
      });
      logInfo(`  Mark Paid button: ${hasMarkPaid}`);
      logSuccess('Mark Paid check complete');
    }));

    results.push(await runTest('16.7 Screenshot payout obligations', async () => {
      const filepath = await screenshot(page!, '16-payout-obligations', true);
      assert(filepath.length > 0, 'Screenshot saved');
    }));

  } catch (error) {
    results.push({ testName: 'E2E Error', passed: false, duration: 0, error: String(error) });
  } finally {
    if (browser) await closeBrowser();
  }
  return results;
}

async function main() {
  logHeader('E2E Test 07: Commission Settings & Payouts');
  const results = await runCommissionsPageE2ETests();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n  Results: ${passed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
export { runCommissionsPageE2ETests };
