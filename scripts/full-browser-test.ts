/**
 * Full Browser-Based Test for Tax Genius Pro
 *
 * Tests all Tax Preparer dashboard pages using Puppeteer:
 * - Captures screenshots of each page
 * - Verifies pages load without errors
 * - Checks for key elements
 *
 * Run with: npx tsx scripts/full-browser-test.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://taxgeniuspro.tax';
const TEST_EMAIL = 'whitegelisa@gmail.com';
const TEST_PASSWORD = 'Makiyah07@@';
const SCREENSHOT_DIR = 'test-results/browser-test';

interface TestResult {
  page: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  screenshot?: string;
  error?: string;
  loadTime?: number;
}

const results: TestResult[] = [];

// Pages to test for Tax Preparer
const TAX_PREPARER_PAGES = [
  { name: '📊 Dashboard Overview', path: '/en/dashboard/tax-preparer' },
  { name: '📊 Analytics', path: '/en/dashboard/tax-preparer/analytics' },
  { name: '📊 My Leads', path: '/en/dashboard/tax-preparer/leads' },
  { name: '📊 My Clients', path: '/en/dashboard/tax-preparer/clients' },
  { name: '📊 File Center', path: '/en/dashboard/tax-preparer/file-center' },
  { name: '📊 Appointments', path: '/en/dashboard/tax-preparer/appointments' },
  { name: '📊 Notifications', path: '/en/dashboard/tax-preparer/notifications' },
  { name: '📊 Settings', path: '/en/dashboard/tax-preparer/settings' },
  { name: '💰 My Referrals', path: '/en/dashboard/tax-preparer/referrals' },
  { name: '💰 My Links & QR', path: '/en/dashboard/tax-preparer/tracking' },
  { name: '💰 Bonded Affiliates', path: '/en/dashboard/tax-preparer/bonded-affiliates' },
  { name: '💰 Commission Settings', path: '/en/dashboard/tax-preparer/commission-settings' },
  { name: '💰 Payout Obligations', path: '/en/dashboard/tax-preparer/payout-obligations' },
];

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

async function ensureScreenshotDir() {
  const dir = path.resolve(SCREENSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function login(page: Page): Promise<boolean> {
  log('🔐', 'Logging in...');

  try {
    await page.goto(`${BASE_URL}/en/auth/signin`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for the form to load
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

    // Fill in email
    const emailInput = await page.$('input[type="email"], input[name="email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(TEST_EMAIL);
    }

    // Fill in password
    const passwordInput = await page.$('input[type="password"], input[name="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(TEST_PASSWORD);
    }

    // Click sign in button
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    }

    // Wait for redirect to dashboard
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Check if we're logged in by looking for dashboard elements
    const currentUrl = page.url();
    if (currentUrl.includes('dashboard')) {
      log('✅', 'Login successful!');
      return true;
    }

    // Check for error message
    const errorElement = await page.$('.text-red-500, .text-destructive, [role="alert"]');
    if (errorElement) {
      const errorText = await page.evaluate(el => el?.textContent, errorElement);
      log('❌', `Login failed: ${errorText}`);
      return false;
    }

    log('⚠️', `Login may have failed. Current URL: ${currentUrl}`);
    return false;
  } catch (error) {
    log('❌', `Login error: ${error}`);
    return false;
  }
}

async function testPage(page: Page, pageName: string, pagePath: string, screenshotDir: string): Promise<TestResult> {
  const url = `${BASE_URL}${pagePath}`;
  const screenshotName = pagePath.replace(/\//g, '_').replace(/^_/, '') + '.png';
  const screenshotPath = path.join(screenshotDir, screenshotName);

  log('🔍', `Testing: ${pageName}`);

  const startTime = Date.now();

  try {
    // Navigate to the page
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Check response status
    if (!response || response.status() >= 400) {
      const status = response?.status() || 'unknown';
      log('❌', `  HTTP ${status} error`);
      return {
        page: pageName,
        url,
        status: 'FAIL',
        error: `HTTP ${status}`,
        loadTime,
      };
    }

    // Wait a moment for React to hydrate
    await page.waitForTimeout(1000);

    // Check for error boundary or error page
    const errorBoundary = await page.$('[class*="error"], .error-boundary, [data-error="true"]');
    const errorText = await page.$eval('body', (body) => {
      const text = body.innerText.toLowerCase();
      if (text.includes('something went wrong') || text.includes('error occurred') || text.includes('error boundary')) {
        return 'Error page detected';
      }
      return null;
    }).catch(() => null);

    if (errorText) {
      log('❌', `  ${errorText}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        page: pageName,
        url,
        status: 'FAIL',
        error: errorText,
        screenshot: screenshotPath,
        loadTime,
      };
    }

    // Take screenshot
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Check for key elements that indicate the page loaded properly
    const hasContent = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"], .container, .dashboard');
      return main && main.children.length > 0;
    });

    if (!hasContent) {
      log('⚠️', `  Page may be empty or not fully loaded`);
    }

    log('✅', `  Loaded in ${loadTime}ms - Screenshot: ${screenshotName}`);

    return {
      page: pageName,
      url,
      status: 'PASS',
      screenshot: screenshotPath,
      loadTime,
    };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    log('❌', `  Error: ${error}`);

    // Try to take screenshot even on error
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (e) {
      // Ignore screenshot error
    }

    return {
      page: pageName,
      url,
      status: 'ERROR',
      error: String(error),
      screenshot: screenshotPath,
      loadTime,
    };
  }
}

async function checkConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (err) => {
    errors.push(err.message);
  });

  return errors;
}

async function printSummary() {
  logSection('TEST SUMMARY');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log('Results by page:\n');

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
    console.log(`${icon} ${result.page}`);
    console.log(`   URL: ${result.url}`);
    if (result.loadTime) {
      console.log(`   Load time: ${result.loadTime}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.screenshot) {
      console.log(`   Screenshot: ${result.screenshot}`);
    }
    console.log('');
  }

  console.log('─'.repeat(40));
  console.log(`Total: ${results.length} pages tested`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`💥 Errors: ${errors}`);
  console.log('');

  // Calculate average load time
  const loadTimes = results.filter(r => r.loadTime).map(r => r.loadTime!);
  if (loadTimes.length > 0) {
    const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
    console.log(`📊 Average load time: ${avgLoadTime}ms`);
  }

  console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log('');

  if (failed > 0 || errors > 0) {
    console.log('⚠️  Some tests failed. Check the screenshots and errors above.');
    return 1;
  } else {
    console.log('🎉 All pages loaded successfully!');
    return 0;
  }
}

async function main() {
  console.log('\n🧪 Full Browser-Based Test for Tax Genius Pro\n');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Test account: ${TEST_EMAIL}\n`);

  const screenshotDir = await ensureScreenshotDir();
  log('📁', `Screenshots will be saved to: ${screenshotDir}`);

  // Launch browser
  log('🌐', 'Launching browser...');
  const browser: Browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page: Page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Set up console error tracking
  const consoleErrors = await checkConsoleErrors(page);

  try {
    // Login first
    logSection('AUTHENTICATION');
    const loginSuccess = await login(page);

    if (!loginSuccess) {
      // Take screenshot of login page
      await page.screenshot({ path: path.join(screenshotDir, 'login-failed.png'), fullPage: true });
      log('❌', 'Cannot proceed without successful login');
      await browser.close();
      process.exit(1);
    }

    // Take screenshot after login
    await page.screenshot({ path: path.join(screenshotDir, '00-after-login.png'), fullPage: true });

    // Test all Tax Preparer pages
    logSection('TAX PREPARER DASHBOARD PAGES');

    for (const pageConfig of TAX_PREPARER_PAGES) {
      const result = await testPage(page, pageConfig.name, pageConfig.path, screenshotDir);
      results.push(result);

      // Small delay between pages to be nice to the server
      await page.waitForTimeout(500);
    }

    // Report console errors
    if (consoleErrors.length > 0) {
      logSection('CONSOLE ERRORS DETECTED');
      for (const error of consoleErrors.slice(0, 10)) {
        log('⚠️', error.substring(0, 200));
      }
      if (consoleErrors.length > 10) {
        log('...', `and ${consoleErrors.length - 10} more errors`);
      }
    }

  } catch (error) {
    log('💥', `Test suite error: ${error}`);
  } finally {
    await browser.close();
  }

  // Print summary
  const exitCode = await printSummary();
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
