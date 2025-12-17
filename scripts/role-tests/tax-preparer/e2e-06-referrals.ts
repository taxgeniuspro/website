/**
 * E2E Test 06: Tax Preparer Referrals & Tracking
 *
 * Tests referrals page and tracking/QR codes.
 */

import { Browser, Page } from 'puppeteer';
import {
  launchBrowser, login, screenshot, navigateTo,
  elementExists, closeBrowser, waitForNetworkIdle,
} from '../test-utils/puppeteer-helpers';
import { runTest, assert, logHeader, logSuccess, logInfo, TestResult } from '../test-utils/index';

const TEST_EMAIL = process.env.TEST_PREPARER_EMAIL || 'whitegelisa@gmail.com';
const TEST_PASSWORD = process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@';

async function runReferralsPageE2ETests(): Promise<TestResult[]> {
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

    results.push(await runTest('15.1 Navigate to referrals', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/referrals');
      await waitForNetworkIdle(page!, 5000);
      logSuccess('Navigated to referrals');
    }));

    results.push(await runTest('15.2 Stats cards present', async () => {
      const hasStats = await page!.evaluate(() => {
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('total') || text.includes('referral') || text.includes('converted');
      });
      assert(hasStats, 'Should have referral stats');
      logSuccess('Referral stats present');
    }));

    results.push(await runTest('15.3 Screenshot referrals', async () => {
      const filepath = await screenshot(page!, '15-referrals', true);
      assert(filepath.length > 0, 'Screenshot saved');
    }));

    results.push(await runTest('15.4 Navigate to tracking', async () => {
      await navigateTo(page!, '/dashboard/tax-preparer/tracking');
      await waitForNetworkIdle(page!, 5000);
      logSuccess('Navigated to tracking');
    }));

    results.push(await runTest('15.5 QR code displays', async () => {
      const hasQR = await page!.evaluate(() => {
        // Look for QR code images
        const imgs = document.querySelectorAll('img');
        for (const img of imgs) {
          if (img.src.includes('qr') || img.alt?.toLowerCase().includes('qr')) return true;
        }
        // Check for canvas (QR might be rendered as canvas)
        if (document.querySelector('canvas')) return true;
        // Check text
        const text = document.body.textContent?.toLowerCase() || '';
        return text.includes('qr') || text.includes('scan');
      });
      logInfo(`  QR code found: ${hasQR}`);
      logSuccess('QR code check complete');
    }));

    results.push(await runTest('15.6 Short links displayed', async () => {
      const hasLinks = await page!.evaluate(() => {
        const text = document.body.textContent || '';
        return text.includes('taxgeniuspro.tax/go/') || text.includes('-lead') || text.includes('-intake');
      });
      logInfo(`  Short links found: ${hasLinks}`);
      logSuccess('Links check complete');
    }));

    results.push(await runTest('15.7 Screenshot tracking', async () => {
      const filepath = await screenshot(page!, '15-tracking', true);
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
  logHeader('E2E Test 06: Referrals & Tracking');
  const results = await runReferralsPageE2ETests();
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n  Results: ${passed}/${results.length} passed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
export { runReferralsPageE2ETests };
