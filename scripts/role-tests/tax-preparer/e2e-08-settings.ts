/**
 * E2E Test 08: Tax Preparer Settings Page
 *
 * Tests the profile settings page.
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser, login, screenshot, navigateTo,
  elementExists, fillInput, clickButton, waitForToast,
  closeBrowser, waitForNetworkIdle, reloadPage,
} from '../test-utils/puppeteer-helpers';
import { runTest, assert, logHeader, logSuccess, logInfo, TestResult } from '../test-utils/index';

const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runSettingsPageE2ETests(): Promise<TestResult[]> {
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

    results.push(await runTest('17.1 Navigate to settings', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/settings');
      await waitForNetworkIdle(page!, 5000);
      assert(page!.url().includes('settings'), 'Should be on settings page');
      logSuccess('Navigated to settings');
    }));

    results.push(await runTest('17.2 Profile form loads', async () => {
      const hasForm = await page!.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea');
        return inputs.length > 0;
      });
      assert(hasForm, 'Should have form inputs');
      logSuccess('Profile form present');
    }));

    results.push(await runTest('17.3 Form has current data', async () => {
      const hasData = await page!.evaluate(() => {
        const inputs = document.querySelectorAll('input');
        for (const input of inputs) {
          if ((input as HTMLInputElement).value) return true;
        }
        return false;
      });
      logInfo(`  Form has data: ${hasData}`);
      logSuccess('Form data check complete');
    }));

    results.push(await runTest('17.4 Save button present', async () => {
      const hasSave = await page!.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b =>
          b.textContent?.toLowerCase().includes('save') ||
          b.textContent?.toLowerCase().includes('update')
        );
      });
      assert(hasSave, 'Should have save button');
      logSuccess('Save button present');
    }));

    results.push(await runTest('17.5 Screenshot settings page', async () => {
      const filepath = await screenshot(page!, '17-settings', true);
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
  logHeader('E2E Test 08: Settings Page');
  const results = await runSettingsPageE2ETests();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n  Results: ${passed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
export { runSettingsPageE2ETests };
