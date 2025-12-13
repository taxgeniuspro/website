/**
 * Role Routing Test Script
 * Tests each role 4 times to verify correct dashboard routing
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = 'https://taxgeniuspro.tax';

// Test accounts with known credentials
const testAccounts = [
  {
    role: 'admin',
    email: 'iradwatkins@gmail.com',
    password: 'TaxGenius2024!',
    expectedDashboard: '/dashboard/admin',
  },
  {
    role: 'tax_preparer',
    email: 'whitegelisa@gmail.com',
    password: 'Makiyah07@@',
    expectedDashboard: '/dashboard/tax-preparer',
  },
  {
    role: 'tax_preparer',
    email: 'taxgenius.tax@gmail.com',
    password: 'TaxGenius2024!',
    expectedDashboard: '/dashboard/tax-preparer',
  },
];

async function login(page: Page, email: string, password: string): Promise<{ url: string; error?: string }> {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.waitForLoadState('networkidle');

  // Take screenshot before login
  await page.screenshot({ path: 'test-results/01-signin-page.png' });

  // Find the form's email input (id="email") - NOT the magic link email input
  const emailInput = page.locator('input#email');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);

  // Find the password input (id="password")
  const passwordInput = page.locator('input#password');
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.fill(password);

  // Take screenshot after filling
  await page.screenshot({ path: 'test-results/02-filled-form.png' });

  // Find the Sign In button (the yellow one with text "Sign In")
  const submitButton = page.locator('button:has-text("Sign In")').last();

  // Click and wait for navigation
  await submitButton.click();

  // Wait for navigation or error
  await page.waitForTimeout(5000);
  await page.waitForLoadState('networkidle');

  // Take screenshot after submit
  await page.screenshot({ path: 'test-results/03-after-submit.png' });

  // Check for error messages - be specific to avoid route announcer
  const alertElement = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
  let errorText = '';
  if (await alertElement.count() > 0) {
    errorText = await alertElement.first().textContent() || '';
  }

  console.log(`    DEBUG: Current URL = ${page.url()}`);
  console.log(`    DEBUG: Error text = "${errorText}"`);

  return { url: page.url(), error: errorText || undefined };
}

async function logout(page: Page): Promise<void> {
  try {
    await page.goto(`${BASE_URL}/auth/signout`);
    await page.waitForLoadState('networkidle');

    // Click signout button if present
    const signoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout"), button:has-text("Sign Out")');
    if (await signoutButton.count() > 0) {
      await signoutButton.first().click();
      await page.waitForLoadState('networkidle');
    }
    await page.waitForTimeout(1000);
  } catch (e) {
    // Ignore logout errors
  }
}

async function checkDebugEndpoint(page: Page): Promise<any> {
  try {
    const response = await page.goto(`${BASE_URL}/api/debug/session`);
    if (response && response.ok()) {
      return await response.json();
    }
  } catch (e) {
    return null;
  }
  return null;
}

async function runTests() {
  console.log('\n========================================');
  console.log('ROLE ROUTING TEST - 4 ITERATIONS EACH');
  console.log('========================================\n');

  // Create test-results directory
  const fs = await import('fs');
  if (!fs.existsSync('test-results')) {
    fs.mkdirSync('test-results', { recursive: true });
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const results: { role: string; email: string; iteration: number; url: string; expected: string; passed: boolean; sessionRole?: string; error?: string }[] = [];

  for (const account of testAccounts) {
    console.log(`\n🔐 Testing ${account.role}: ${account.email}`);
    console.log('─'.repeat(50));

    for (let i = 1; i <= 4; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // Login
        const { url: finalUrl, error } = await login(page, account.email, account.password);

        if (error) {
          console.log(`  [${i}/4] ⚠️  Login error: ${error}`);
        }

        // Check debug endpoint for session role
        const debugData = await checkDebugEndpoint(page);
        const sessionRole = debugData?.session?.roleFromSession || 'unknown';

        // Check if URL contains expected dashboard
        const passed = finalUrl.includes(account.expectedDashboard);

        results.push({
          role: account.role,
          email: account.email,
          iteration: i,
          url: finalUrl,
          expected: account.expectedDashboard,
          passed,
          sessionRole,
          error,
        });

        const status = passed ? '✅' : '❌';
        console.log(`  [${i}/4] ${status} Landed on: ${finalUrl.replace(BASE_URL, '')}`);
        console.log(`         Session role: ${sessionRole}`);

        // Logout for next test
        await logout(page);

      } catch (error) {
        console.log(`  [${i}/4] ❌ ERROR: ${error}`);
        results.push({
          role: account.role,
          email: account.email,
          iteration: i,
          url: 'ERROR',
          expected: account.expectedDashboard,
          passed: false,
        });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  // Summary
  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.email} [${r.iteration}]: Got ${r.url}, expected ${r.expected}`);
      if (r.sessionRole) {
        console.log(`    Session role was: ${r.sessionRole}`);
      }
      if (r.error) {
        console.log(`    Error: ${r.error}`);
      }
    });
  }

  console.log('\nScreenshots saved in test-results/');
  console.log('\n');

  return failed === 0;
}

runTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test error:', err);
    process.exit(1);
  });
