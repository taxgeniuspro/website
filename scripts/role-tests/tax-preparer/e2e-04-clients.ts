/**
 * E2E Test 04: Tax Preparer Clients Page
 *
 * Tests the clients management page.
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser, login, screenshot, navigateTo,
  waitForSelector, elementExists, closeBrowser, waitForNetworkIdle, delay,
} from '../test-utils/puppeteer-helpers';
import { runTest, assert, logHeader, logSuccess, logInfo, logError, TestResult } from '../test-utils/index';

const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runClientsPageE2ETests(): Promise<TestResult[]> {
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

    results.push(await runTest('13.1 Navigate to clients page', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/clients');
      await waitForNetworkIdle(page!, 5000);
      assert(page!.url().includes('clients'), 'Should be on clients page');
      logSuccess('Navigated to clients page');
    }));

    results.push(await runTest('13.2 Stats cards load', async () => {
      const hasStats = await page!.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('total') || text.includes('active') || text.includes('pending');
      });
      assert(hasStats, 'Should have stats cards');
      logSuccess('Stats cards present');
    }));

    results.push(await runTest('13.3 Client table displays', async () => {
      await delay(2000);
      const hasTable = await elementExists(page!, 'table, [role="grid"], [class*="table"]');
      const hasNoClients = await page!.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('no clients');
      });
      assert(hasTable || hasNoClients, 'Should have clients table or empty state');
      logSuccess('Clients list loaded');
    }));

    results.push(await runTest('13.4 Screenshot clients page', async () => {
      const filepath = await screenshot(page!, '13-clients-page', true);
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
  logHeader('E2E Test 04: Clients Page');
  const results = await runClientsPageE2ETests();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n  Results: ${passed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
export { runClientsPageE2ETests };
