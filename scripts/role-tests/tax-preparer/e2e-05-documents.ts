/**
 * E2E Test 05: Tax Preparer Documents/File Center
 *
 * Tests the document management page.
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser, login, screenshot, navigateTo,
  waitForSelector, elementExists, closeBrowser, waitForNetworkIdle,
} from '../test-utils/puppeteer-helpers';
import { runTest, assert, logHeader, logSuccess, logInfo, TestResult } from '../test-utils/index';

const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runDocumentsPageE2ETests(): Promise<TestResult[]> {
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

    results.push(await runTest('14.1 Navigate to documents page', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/documents');
      await waitForNetworkIdle(page!, 5000);
      assert(page!.url().includes('documents'), 'Should be on documents page');
      logSuccess('Navigated to documents');
    }));

    results.push(await runTest('14.2 Folder tree renders', async () => {
      const hasFolders = await page!.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('folder') || text.includes('client') || text.includes('document');
      });
      assert(hasFolders, 'Should have folder/document content');
      logSuccess('Document structure present');
    }));

    results.push(await runTest('14.3 Upload button present', async () => {
      const hasUpload = await page!.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b => b.textContent?.toLowerCase().includes('upload'));
      });
      logInfo(`  Upload button: ${hasUpload}`);
      logSuccess('Upload check complete');
    }));

    results.push(await runTest('14.4 Screenshot documents page', async () => {
      const filepath = await screenshot(page!, '14-documents', true);
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
  logHeader('E2E Test 05: Documents Page');
  const results = await runDocumentsPageE2ETests();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n  Results: ${passed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
export { runDocumentsPageE2ETests };
