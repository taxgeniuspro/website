/**
 * Full Admin E2E Test for Tax Genius Pro
 *
 * Tests all Admin dashboard pages using Puppeteer:
 * - Captures screenshots of each page
 * - Verifies pages load without errors
 * - Tests empty state handling
 * - Validates key elements are present
 *
 * Run with: npx tsx scripts/test-admin-full.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to wait for a specified time
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BASE_URL = 'https://taxgeniuspro.tax';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'iradwatkins@gmail.com';
// Note: Password should be provided via environment variable for security
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.TEST_ADMIN_PASSWORD || '';
const SCREENSHOT_DIR = 'test-results/admin-e2e';

interface TestResult {
  page: string;
  url: string;
  status: 'PASS' | 'FAIL' | 'ERROR' | 'SKIP';
  screenshot?: string;
  error?: string;
  loadTime?: number;
  elements?: { found: string[]; missing: string[] };
}

interface PageConfig {
  name: string;
  path: string;
  priority: 'MUST' | 'NICE' | 'LOW';
  expectedElements?: string[];
  emptyStateText?: string;
}

const results: TestResult[] = [];

// Admin pages to test - organized by priority
const ADMIN_PAGES: PageConfig[] = [
  // MUST-HAVE: Critical admin pages
  { name: 'Admin Dashboard', path: '/en/dashboard/admin', priority: 'MUST', expectedElements: ['h1', '[class*="rounded-lg"][class*="border"]', 'main'] },
  { name: 'Users Management', path: '/en/admin/users', priority: 'MUST', expectedElements: ['table', 'h1'] },
  { name: 'Leads Management', path: '/en/admin/leads', priority: 'MUST', emptyStateText: 'no leads' },
  { name: 'Clients Status', path: '/en/admin/clients-status', priority: 'MUST', emptyStateText: 'no clients' },
  { name: 'Payouts', path: '/en/admin/payouts', priority: 'MUST', emptyStateText: 'no payouts' },
  { name: 'Analytics Overview', path: '/en/admin/analytics', priority: 'MUST' },
  { name: 'Preparer Applications', path: '/en/admin/applications/preparers', priority: 'MUST' },
  { name: 'Preparer Analytics', path: '/en/admin/analytics/preparers', priority: 'MUST' },
  { name: 'Orders', path: '/en/admin/orders', priority: 'MUST', emptyStateText: 'no orders' },
  { name: 'Permissions', path: '/en/admin/permissions', priority: 'MUST' },

  // NICE-TO-HAVE: Secondary admin pages
  { name: 'Affiliate Applications', path: '/en/admin/applications/affiliates', priority: 'NICE' },
  { name: 'Affiliate Analytics', path: '/en/admin/analytics/affiliates', priority: 'NICE' },
  { name: 'CRM Permissions', path: '/en/admin/crm/permissions', priority: 'NICE' },
  { name: 'Products', path: '/en/admin/products', priority: 'NICE' },
  { name: 'Tracking Codes', path: '/en/admin/tracking-codes', priority: 'NICE' },
  { name: 'Booking Settings', path: '/en/admin/booking-settings', priority: 'NICE' },
  { name: 'Image Center', path: '/en/admin/image-center', priority: 'NICE' },
  { name: 'Quick Share', path: '/en/admin/quick-share', priority: 'NICE' },
  { name: 'Earnings', path: '/en/admin/earnings', priority: 'NICE' },
  { name: 'Referrals Status', path: '/en/admin/referrals-status', priority: 'NICE' },
  { name: 'Affiliates Hub', path: '/en/dashboard/admin/affiliates', priority: 'NICE' },
  { name: 'Affiliate Groups', path: '/en/dashboard/admin/affiliates/groups', priority: 'NICE' },

  // LOWER PRIORITY: Edge case pages
  { name: 'Route Access Control', path: '/en/admin/route-access-control', priority: 'LOW' },
  { name: 'Content Generator', path: '/en/admin/content-generator', priority: 'LOW' },
  { name: 'Content Restrictions', path: '/en/admin/content-restrictions', priority: 'LOW' },
  { name: 'Tax Forms', path: '/en/admin/tax-forms', priority: 'LOW' },
  { name: 'File Center', path: '/en/admin/file-center', priority: 'LOW' },
  { name: 'Calendar', path: '/en/admin/calendar', priority: 'LOW' },
  { name: 'Marketing Hub', path: '/en/admin/marketing-hub', priority: 'LOW' },
  { name: 'Settings', path: '/en/admin/settings', priority: 'LOW' },
  { name: 'Setup', path: '/en/admin/setup', priority: 'LOW' },
];

function log(emoji: string, message: string) {
  console.log(`${emoji} ${message}`);
}

function logSection(title: string) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60) + '\n');
}

async function ensureScreenshotDir() {
  const dir = path.resolve(SCREENSHOT_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

async function login(page: Page): Promise<boolean> {
  log('🔐', 'Logging in as admin...');

  if (!ADMIN_PASSWORD) {
    log('❌', 'ADMIN_PASSWORD environment variable not set!');
    log('📝', 'Run with: ADMIN_PASSWORD=your_password npx tsx scripts/test-admin-full.ts');
    return false;
  }

  try {
    await page.goto(`${BASE_URL}/en/auth/signin`, { waitUntil: 'networkidle2', timeout: 30000 });
    log('📄', `Loaded signin page: ${page.url()}`);

    // Wait for the form to load - specifically the email/password form (not the magic link input)
    await page.waitForSelector('#email', { timeout: 10000 });
    log('✓', 'Found email input');

    // Fill in email using the specific ID selector
    const emailInput = await page.$('#email');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await sleep(100);
      await emailInput.type(ADMIN_EMAIL, { delay: 30 });
      log('✓', `Entered email: ${ADMIN_EMAIL}`);
    }

    // Fill in password using the specific ID selector
    const passwordInput = await page.$('#password');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await sleep(100);
      await passwordInput.type(ADMIN_PASSWORD, { delay: 30 });
      log('✓', 'Entered password');
    }

    // Take screenshot before submit
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-before-submit.png'), fullPage: true });
    log('📸', 'Screenshot taken before submit');

    // Click sign in button
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      log('✓', 'Found submit button, clicking...');
      await submitButton.click();
    } else {
      log('❌', 'Submit button not found!');
      return false;
    }

    // The login form uses redirect: false with router.push, so we need to wait for URL change
    // instead of waitForNavigation
    log('⏳', 'Waiting for login to complete...');

    // Wait for URL to change to dashboard (with polling)
    let attempts = 0;
    const maxAttempts = 20; // 20 seconds max
    while (attempts < maxAttempts) {
      await sleep(1000);
      const currentUrl = page.url();

      // Check if we're on the dashboard
      if (currentUrl.includes('dashboard')) {
        log('✅', 'Login successful!');
        // Wait a bit more for page to fully load
        await sleep(2000);
        return true;
      }

      // Check for error message (more comprehensive selectors)
      const errorElement = await page.$('.text-red-500, .text-destructive, [role="alert"], .bg-destructive, .error-message');
      if (errorElement) {
        const errorText = await page.evaluate(el => el?.textContent, errorElement);
        if (errorText && errorText.trim()) {
          log('❌', `Login failed: ${errorText}`);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-error.png'), fullPage: true });
          return false;
        }
      }

      // Take a screenshot every 5 seconds to help debug
      if (attempts % 5 === 0 && attempts > 0) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `login-waiting-${attempts}s.png`), fullPage: true });
        log('📸', `Screenshot at ${attempts}s: ${currentUrl}`);
      }

      attempts++;
    }

    const finalUrl = page.url();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-timeout.png'), fullPage: true });
    log('⚠️', `Login timed out. Final URL: ${finalUrl}`);
    return false;
  } catch (error) {
    log('❌', `Login error: ${error}`);
    return false;
  }
}

async function testPage(page: Page, config: PageConfig, screenshotDir: string): Promise<TestResult> {
  const url = `${BASE_URL}${config.path}`;
  const screenshotName = config.path.replace(/\//g, '_').replace(/^_/, '') + '.png';
  const screenshotPath = path.join(screenshotDir, screenshotName);

  const priorityIcon = config.priority === 'MUST' ? '🔴' : config.priority === 'NICE' ? '🟡' : '🟢';
  log(priorityIcon, `Testing: ${config.name} [${config.priority}]`);

  const startTime = Date.now();
  const foundElements: string[] = [];
  const missingElements: string[] = [];

  try {
    // Navigate to the page
    const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    const loadTime = Date.now() - startTime;

    // Check response status
    if (!response || response.status() >= 400) {
      const status = response?.status() || 'unknown';
      log('❌', `  HTTP ${status} error`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        page: config.name,
        url,
        status: 'FAIL',
        error: `HTTP ${status}`,
        loadTime,
        screenshot: screenshotPath,
      };
    }

    // Wait a moment for React to hydrate
    await sleep(1500);

    // Check for forbidden/redirect (non-admin access)
    const currentUrl = page.url();
    if (currentUrl.includes('/forbidden') || currentUrl.includes('/auth/signin')) {
      log('❌', `  Redirected to: ${currentUrl}`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return {
        page: config.name,
        url,
        status: 'FAIL',
        error: `Redirected to ${currentUrl} - may indicate permission issue`,
        loadTime,
        screenshot: screenshotPath,
      };
    }

    // Check for error boundary or error page
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
        page: config.name,
        url,
        status: 'FAIL',
        error: errorText,
        screenshot: screenshotPath,
        loadTime,
      };
    }

    // Check for expected elements
    if (config.expectedElements) {
      for (const selector of config.expectedElements) {
        const element = await page.$(selector);
        if (element) {
          foundElements.push(selector);
        } else {
          missingElements.push(selector);
        }
      }
    }

    // Check for empty state text (not an error, just informational)
    let emptyStateFound = false;
    if (config.emptyStateText) {
      const bodyText = await page.$eval('body', (body) => body.innerText.toLowerCase());
      emptyStateFound = bodyText.includes(config.emptyStateText.toLowerCase());
      if (emptyStateFound) {
        log('ℹ️', `  Empty state detected (expected after reset)`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Check for key elements that indicate the page loaded properly
    const hasContent = await page.evaluate(() => {
      const main = document.querySelector('main, [role="main"], .container, .dashboard');
      const sidebar = document.querySelector('[data-sidebar], aside, nav');
      return (main && main.children.length > 0) || (sidebar !== null);
    });

    if (!hasContent) {
      log('⚠️', `  Page may be empty or not fully loaded`);
    }

    // Determine status
    let status: 'PASS' | 'FAIL' = 'PASS';
    if (missingElements.length > 0 && config.priority === 'MUST') {
      status = 'FAIL';
      log('⚠️', `  Missing elements: ${missingElements.join(', ')}`);
    }

    log('✅', `  Loaded in ${loadTime}ms`);

    return {
      page: config.name,
      url,
      status,
      screenshot: screenshotPath,
      loadTime,
      elements: { found: foundElements, missing: missingElements },
    };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    log('❌', `  Error: ${error}`);

    // Try to take screenshot even on error
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch {
      // Ignore screenshot error
    }

    return {
      page: config.name,
      url,
      status: 'ERROR',
      error: String(error),
      screenshot: screenshotPath,
      loadTime,
    };
  }
}

async function testUnauthorizedAccess(browser: Browser, screenshotDir: string): Promise<TestResult[]> {
  logSection('UNAUTHORIZED ACCESS TESTS');

  const unauthorizedResults: TestResult[] = [];
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Test unauthenticated access to admin pages
  const testPages = [
    '/en/admin/users',
    '/en/admin/payouts',
    '/en/admin/analytics',
  ];

  for (const testPath of testPages) {
    const url = `${BASE_URL}${testPath}`;
    log('🔒', `Testing unauthenticated access: ${testPath}`);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      const currentUrl = page.url();

      const shouldRedirect = currentUrl.includes('/auth/signin') || currentUrl.includes('/forbidden');

      if (shouldRedirect) {
        log('✅', `  Correctly redirected to: ${currentUrl}`);
        unauthorizedResults.push({
          page: `Unauthorized: ${testPath}`,
          url,
          status: 'PASS',
        });
      } else {
        log('❌', `  SECURITY ISSUE: Page accessible without auth!`);
        await page.screenshot({
          path: path.join(screenshotDir, `security_issue${testPath.replace(/\//g, '_')}.png`),
          fullPage: true,
        });
        unauthorizedResults.push({
          page: `Unauthorized: ${testPath}`,
          url,
          status: 'FAIL',
          error: 'Page accessible without authentication',
        });
      }
    } catch (error) {
      log('⚠️', `  Error testing: ${error}`);
      unauthorizedResults.push({
        page: `Unauthorized: ${testPath}`,
        url,
        status: 'ERROR',
        error: String(error),
      });
    }
  }

  await context.close();
  return unauthorizedResults;
}

function printSummary(): number {
  logSection('TEST SUMMARY');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  // Group by priority
  const mustResults = results.filter(r => ADMIN_PAGES.find(p => p.name === r.page)?.priority === 'MUST');
  const niceResults = results.filter(r => ADMIN_PAGES.find(p => p.name === r.page)?.priority === 'NICE');
  const lowResults = results.filter(r => ADMIN_PAGES.find(p => p.name === r.page)?.priority === 'LOW');

  console.log('MUST-HAVE Pages (Critical):');
  for (const result of mustResults) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
    console.log(`  ${icon} ${result.page} (${result.loadTime}ms)`);
    if (result.error) console.log(`      Error: ${result.error}`);
  }

  console.log('\nNICE-TO-HAVE Pages:');
  for (const result of niceResults) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
    console.log(`  ${icon} ${result.page} (${result.loadTime}ms)`);
  }

  console.log('\nLOWER PRIORITY Pages:');
  for (const result of lowResults) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
    console.log(`  ${icon} ${result.page} (${result.loadTime}ms)`);
  }

  // Print unauthorized access results
  const unauthorizedResults = results.filter(r => r.page.startsWith('Unauthorized:'));
  if (unauthorizedResults.length > 0) {
    console.log('\nSECURITY TESTS (Unauthorized Access):');
    for (const result of unauthorizedResults) {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${icon} ${result.page}`);
    }
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`Total: ${results.length} tests`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`💥 Errors: ${errors}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('');

  // Calculate average load time
  const loadTimes = results.filter(r => r.loadTime).map(r => r.loadTime!);
  if (loadTimes.length > 0) {
    const avgLoadTime = Math.round(loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length);
    console.log(`📊 Average load time: ${avgLoadTime}ms`);
  }

  console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log('');

  // MUST-HAVE pages failing is critical
  const mustFailed = mustResults.filter(r => r.status !== 'PASS').length;
  if (mustFailed > 0) {
    console.log(`🚨 CRITICAL: ${mustFailed} MUST-HAVE page(s) failed!`);
    return 1;
  }

  if (failed > 0 || errors > 0) {
    console.log('⚠️  Some tests failed. Check the screenshots and errors above.');
    return 1;
  }

  console.log('🎉 All admin pages loaded successfully!');
  return 0;
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      ADMIN E2E TEST - Tax Genius Pro                       ║');
  console.log('║      Testing all 29 admin pages                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Admin account: ${ADMIN_EMAIL}\n`);

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
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // Test unauthorized access first (before logging in)
    const unauthorizedResults = await testUnauthorizedAccess(browser, screenshotDir);
    results.push(...unauthorizedResults);

    // Login
    logSection('AUTHENTICATION');
    const loginSuccess = await login(page);

    if (!loginSuccess) {
      // Take screenshot of login page
      await page.screenshot({ path: path.join(screenshotDir, 'login-failed.png'), fullPage: true });
      log('❌', 'Cannot proceed without successful login');
      log('📝', 'Make sure to set ADMIN_PASSWORD environment variable');
      await browser.close();
      process.exit(1);
    }

    // Take screenshot after login
    await page.screenshot({ path: path.join(screenshotDir, '00-after-login.png'), fullPage: true });

    // Test all admin pages by priority
    logSection('MUST-HAVE ADMIN PAGES');
    const mustPages = ADMIN_PAGES.filter(p => p.priority === 'MUST');
    for (const pageConfig of mustPages) {
      const result = await testPage(page, pageConfig, screenshotDir);
      results.push(result);
      await sleep(500);
    }

    logSection('NICE-TO-HAVE ADMIN PAGES');
    const nicePages = ADMIN_PAGES.filter(p => p.priority === 'NICE');
    for (const pageConfig of nicePages) {
      const result = await testPage(page, pageConfig, screenshotDir);
      results.push(result);
      await sleep(500);
    }

    logSection('LOWER PRIORITY ADMIN PAGES');
    const lowPages = ADMIN_PAGES.filter(p => p.priority === 'LOW');
    for (const pageConfig of lowPages) {
      const result = await testPage(page, pageConfig, screenshotDir);
      results.push(result);
      await sleep(500);
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
  const exitCode = printSummary();
  process.exit(exitCode);
}

main().catch((error) => {
  console.error('Test failed:', error);
  process.exit(1);
});
