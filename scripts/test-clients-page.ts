/**
 * Clients Page Test Script
 * Tests tax preparer clients page
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'https://taxgeniuspro.tax';

// Tax preparer account
const preparerAccount = {
  email: 'whitegelisa@gmail.com',
  password: 'Makiyah07@@',
};

async function login(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input#email');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(preparerAccount.email);

  const passwordInput = page.locator('input#password');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(preparerAccount.password);

  const submitButton = page.locator('button:has-text("Sign In")').last();
  await submitButton.click();

  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');

  const url = page.url();
  console.log(`After login URL: ${url}`);
  return url.includes('/dashboard');
}

async function runTests() {
  console.log('\n========================================');
  console.log('TAX PREPARER CLIENTS PAGE TEST');
  console.log('========================================\n');

  const fs = await import('fs');
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login first
    console.log('Logging in as tax preparer...');
    const loggedIn = await login(page);

    if (!loggedIn) {
      console.log('Failed to login');
      await browser.close();
      return false;
    }

    console.log('Login successful!');

    // Navigate to clients page
    console.log('\nNavigating to /en/dashboard/tax-preparer/clients...');
    await page.goto(`${BASE_URL}/en/dashboard/tax-preparer/clients`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/tax-preparer-clients.png' });

    // Check for errors
    const errorBoundary = page.locator('text="An error occurred"');
    if (await errorBoundary.count() > 0) {
      console.log('ERROR: Page has error boundary');
      return false;
    }

    // Check for 404
    const notFound = page.locator('text="404"');
    if (await notFound.count() > 0) {
      console.log('ERROR: Page returned 404');
      return false;
    }

    // Check page content
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    const h1 = await page.locator('h1').first().textContent();
    console.log(`H1: ${h1}`);

    if (h1?.includes('My Clients')) {
      console.log('\n✅ Clients page loaded successfully!');
      return true;
    } else {
      console.log('\n❌ Unexpected page content');
      return false;
    }

  } finally {
    await browser.close();
  }
}

runTests()
  .then(success => {
    console.log('\nScreenshot saved in test-results/tax-preparer-clients.png\n');
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
