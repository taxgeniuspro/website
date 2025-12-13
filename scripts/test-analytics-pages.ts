/**
 * Analytics Pages Test Script
 * Tests admin analytics pages after PaymentStatus enum fix
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'https://taxgeniuspro.tax';

// Admin account
const adminAccount = {
  email: 'iradwatkins@gmail.com',
  password: 'TaxGenius2024!',
};

// Pages to test
const analyticsPages = [
  '/en/admin/analytics',
  '/en/admin/analytics/affiliates',
  '/en/admin/analytics/preparers',
];

async function login(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input#email');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(adminAccount.email);

  const passwordInput = page.locator('input#password');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(adminAccount.password);

  const submitButton = page.locator('button:has-text("Sign In")').last();
  await submitButton.click();

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');

  // Check if logged in successfully
  const url = page.url();
  console.log(`After login URL: ${url}`);
  return url.includes('/dashboard');
}

async function testPage(page: Page, path: string): Promise<{ path: string; success: boolean; error?: string }> {
  console.log(`\nTesting: ${path}`);

  try {
    await page.goto(`${BASE_URL}${path}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    const screenshotName = path.replace(/\//g, '_').replace(/^_/, '') + '.png';
    await page.screenshot({ path: `test-results/${screenshotName}` });

    // Check for error boundary
    const errorBoundary = page.locator('text="An error occurred in the admin panel"');
    if (await errorBoundary.count() > 0) {
      const errorId = await page.locator('text=/Error ID:/').textContent();
      return { path, success: false, error: `Error boundary triggered. ${errorId || ''}` };
    }

    // Check for specific error content
    const serverError = await page.locator('text="Server Components render"').count();
    if (serverError > 0) {
      return { path, success: false, error: 'Server Components render error' };
    }

    // Check if page loaded correctly by looking for expected content
    const pageTitle = await page.title();
    console.log(`  Page title: ${pageTitle}`);

    // Check for key elements
    const hasContent = await page.locator('h1').count() > 0;

    if (hasContent) {
      const h1Text = await page.locator('h1').first().textContent();
      console.log(`  H1: ${h1Text}`);
      return { path, success: true };
    }

    return { path, success: false, error: 'No content loaded' };

  } catch (error) {
    return { path, success: false, error: String(error) };
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('ANALYTICS PAGES TEST');
  console.log('========================================\n');

  const fs = await import('fs');
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results: { path: string; success: boolean; error?: string }[] = [];

  try {
    // Login first
    console.log('Logging in as admin...');
    const loggedIn = await login(page);

    if (!loggedIn) {
      console.log('Failed to login');
      await browser.close();
      return false;
    }

    console.log('Login successful!');

    // Test each analytics page
    for (const path of analyticsPages) {
      const result = await testPage(page, path);
      results.push(result);
    }

  } finally {
    await browser.close();
  }

  // Summary
  console.log('\n========================================');
  console.log('RESULTS');
  console.log('========================================\n');

  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.path}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  const allPassed = results.every(r => r.success);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  console.log('Screenshots saved in test-results/\n');

  return allPassed;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
