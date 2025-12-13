import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive Role-Based Authentication Tests
 *
 * Tests the authentication flow for all 4 valid user roles:
 * - admin
 * - tax_preparer
 * - client
 * - lead
 *
 * Each role is tested 4 times for stability verification.
 *
 * NOTE: The 'affiliate' role was deprecated and merged into client with affiliateStatus.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3005';

// ONLY 4 VALID ROLES (affiliate role removed - now clients with affiliateStatus)
const testAccounts = [
  {
    role: 'Admin',
    dbRole: 'admin',
    email: 'admin@test.com',
    password: 'admin123',
    expectedUrl: '/dashboard/admin',
    expectedElements: ['Dashboard', 'Admin'],
    forbiddenElements: [], // Admins can see everything
  },
  {
    role: 'Tax Preparer',
    dbRole: 'tax_preparer',
    email: 'preparer@test.com',
    password: 'preparer123',
    expectedUrl: '/dashboard/tax-preparer',
    expectedElements: ['Dashboard', 'Preparer'],
    forbiddenElements: [],
  },
  {
    role: 'Client',
    dbRole: 'client',
    email: 'client@test.com',
    password: 'client123',
    expectedUrl: '/dashboard/client',
    expectedElements: ['Dashboard'],
    forbiddenElements: ['Admin Panel', 'User Management'],
  },
  {
    role: 'Lead',
    dbRole: 'lead',
    email: 'lead@test.com',
    password: 'lead123',
    expectedUrl: '/dashboard/lead',
    expectedElements: ['Pending', 'Approval'],
    forbiddenElements: ['Admin', 'Tax Return'],
  },
];

// Number of iterations for stability testing
const ITERATIONS = 4;

/**
 * Helper function to login with test credentials
 */
async function loginWithCredentials(page: Page, email: string, password: string) {
  // Navigate to the real signin page (not test-login)
  await page.goto(`${BASE_URL}/auth/signin`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);

  // Click submit button
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForLoadState('networkidle');
}

/**
 * Helper function to logout
 */
async function logout(page: Page) {
  try {
    await page.goto(`${BASE_URL}/auth/signout`);
    await page.waitForLoadState('networkidle');

    // Click signout button if there's a confirmation
    const signoutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout")');
    if ((await signoutButton.count()) > 0) {
      await signoutButton.first().click();
      await page.waitForLoadState('networkidle');
    }
  } catch {
    // Ignore logout errors, just navigate away
    await page.goto(`${BASE_URL}/`);
  }
}

// =============================================================================
// MAIN TEST SUITE: Role Authentication with 4x Iterations
// =============================================================================

test.describe('Comprehensive Role Authentication Tests (4 iterations each)', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport size for consistent screenshots
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  // Generate tests for each role with 4 iterations
  for (let iteration = 1; iteration <= ITERATIONS; iteration++) {
    test.describe(`Iteration ${iteration} of ${ITERATIONS}`, () => {
      for (const account of testAccounts) {
        test(`[${iteration}/${ITERATIONS}] ${account.role}: Login redirects to ${account.expectedUrl}`, async ({
          page,
        }) => {
          // Step 1: Login
          await loginWithCredentials(page, account.email, account.password);

          // Step 2: Wait for redirect (up to 15 seconds)
          await page.waitForURL(new RegExp(account.expectedUrl.replace('/', '\\/')), {
            timeout: 15000,
          });

          // Step 3: Verify URL contains expected path
          expect(page.url()).toContain(account.expectedUrl);

          // Step 4: Verify expected elements are visible
          const bodyText = (await page.textContent('body')) || '';
          for (const element of account.expectedElements) {
            expect(bodyText.toLowerCase()).toContain(element.toLowerCase());
          }

          // Step 5: Verify forbidden elements are NOT visible
          for (const forbidden of account.forbiddenElements) {
            expect(bodyText).not.toContain(forbidden);
          }

          // Step 6: Take screenshot for evidence
          await page.screenshot({
            path: `test-results/role-${account.dbRole}-iteration-${iteration}.png`,
            fullPage: true,
          });

          // Step 7: Log success
          console.log(
            `✅ [${iteration}/${ITERATIONS}] ${account.role} redirected to ${page.url()}`
          );

          // Step 8: Logout for next test
          await logout(page);
        });
      }
    });
  }
});

// =============================================================================
// ROLE PERSISTENCE TESTS
// =============================================================================

test.describe('Role Persistence Tests (refresh 4 times)', () => {
  for (const account of testAccounts) {
    test(`${account.role}: Role persists after ${ITERATIONS} page refreshes`, async ({ page }) => {
      // Login
      await loginWithCredentials(page, account.email, account.password);

      // Wait for initial redirect
      await page.waitForURL(new RegExp(account.expectedUrl.replace('/', '\\/')), {
        timeout: 15000,
      });

      // Verify initial URL
      expect(page.url()).toContain(account.expectedUrl);

      // Refresh page ITERATIONS times and verify each time
      for (let i = 1; i <= ITERATIONS; i++) {
        await page.reload();
        await page.waitForLoadState('networkidle');

        // URL should still be correct after refresh
        expect(page.url()).toContain(account.expectedUrl);

        console.log(
          `✅ ${account.role}: Refresh ${i}/${ITERATIONS} - still on ${account.expectedUrl}`
        );
      }

      // Take final screenshot
      await page.screenshot({
        path: `test-results/role-${account.dbRole}-persistence-final.png`,
        fullPage: true,
      });

      // Cleanup
      await logout(page);
    });
  }
});

// =============================================================================
// UNAUTHORIZED ACCESS PREVENTION TESTS
// =============================================================================

test.describe('Unauthorized Access Prevention', () => {
  test('Lead cannot access /admin', async ({ page }) => {
    // Login as lead
    await loginWithCredentials(page, 'lead@test.com', 'lead123');
    await page.waitForURL(/dashboard\/lead/, { timeout: 15000 });

    // Try to access admin area
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Should NOT be on admin dashboard
    const url = page.url();
    expect(url).not.toContain('/admin');

    // Take screenshot of where they ended up
    await page.screenshot({
      path: 'test-results/unauthorized-lead-to-admin.png',
      fullPage: true,
    });

    await logout(page);
  });

  test('Lead cannot access /dashboard/admin', async ({ page }) => {
    await loginWithCredentials(page, 'lead@test.com', 'lead123');
    await page.waitForURL(/dashboard\/lead/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/dashboard/admin`);
    await page.waitForLoadState('networkidle');

    // Should redirect away from admin dashboard
    expect(page.url()).not.toContain('/dashboard/admin');

    await page.screenshot({
      path: 'test-results/unauthorized-lead-to-dashboard-admin.png',
      fullPage: true,
    });

    await logout(page);
  });

  test('Client cannot access /dashboard/tax-preparer', async ({ page }) => {
    await loginWithCredentials(page, 'client@test.com', 'client123');
    await page.waitForURL(/dashboard\/client/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/dashboard/tax-preparer`);
    await page.waitForLoadState('networkidle');

    // Should redirect away from tax preparer dashboard
    expect(page.url()).not.toContain('/dashboard/tax-preparer');

    await page.screenshot({
      path: 'test-results/unauthorized-client-to-tax-preparer.png',
      fullPage: true,
    });

    await logout(page);
  });

  test('Client cannot access /admin', async ({ page }) => {
    await loginWithCredentials(page, 'client@test.com', 'client123');
    await page.waitForURL(/dashboard\/client/, { timeout: 15000 });

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Should NOT be on admin pages
    expect(page.url()).not.toContain('/admin');

    await page.screenshot({
      path: 'test-results/unauthorized-client-to-admin.png',
      fullPage: true,
    });

    await logout(page);
  });
});

// =============================================================================
// SESSION EXPIRY SIMULATION TEST
// =============================================================================

test.describe('Session Handling', () => {
  test('Unauthenticated user is redirected to signin when accessing dashboard', async ({
    page,
  }) => {
    // Try to access dashboard without being logged in
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should redirect to signin
    const url = page.url();
    expect(url).toContain('/auth/signin');

    await page.screenshot({
      path: 'test-results/unauthenticated-dashboard-redirect.png',
      fullPage: true,
    });
  });

  test('Unauthenticated user is redirected to signin when accessing /admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');

    // Should redirect to signin
    const url = page.url();
    expect(url).toContain('/auth/signin');

    await page.screenshot({
      path: 'test-results/unauthenticated-admin-redirect.png',
      fullPage: true,
    });
  });
});

// =============================================================================
// ROLE-SPECIFIC DASHBOARD CONTENT TESTS
// =============================================================================

test.describe('Dashboard Content Verification', () => {
  test('Admin dashboard shows admin-specific content', async ({ page }) => {
    await loginWithCredentials(page, 'admin@test.com', 'admin123');
    await page.waitForURL(/dashboard\/admin/, { timeout: 15000 });

    const bodyText = (await page.textContent('body')) || '';

    // Admin should see management content
    const hasAdminContent =
      bodyText.includes('Admin') ||
      bodyText.includes('Users') ||
      bodyText.includes('Analytics') ||
      bodyText.includes('Dashboard');

    expect(hasAdminContent).toBeTruthy();

    await page.screenshot({
      path: 'test-results/admin-dashboard-content.png',
      fullPage: true,
    });

    await logout(page);
  });

  test('Tax Preparer dashboard shows preparer-specific content', async ({ page }) => {
    await loginWithCredentials(page, 'preparer@test.com', 'preparer123');
    await page.waitForURL(/dashboard\/tax-preparer/, { timeout: 15000 });

    const bodyText = (await page.textContent('body')) || '';

    // Tax preparer should see client/preparer content
    const hasPreparerContent =
      bodyText.includes('Preparer') ||
      bodyText.includes('Clients') ||
      bodyText.includes('Tracking') ||
      bodyText.includes('Dashboard');

    expect(hasPreparerContent).toBeTruthy();

    await page.screenshot({
      path: 'test-results/tax-preparer-dashboard-content.png',
      fullPage: true,
    });

    await logout(page);
  });

  test('Client dashboard shows client-specific content', async ({ page }) => {
    await loginWithCredentials(page, 'client@test.com', 'client123');
    await page.waitForURL(/dashboard\/client/, { timeout: 15000 });

    const bodyText = (await page.textContent('body')) || '';

    // Client should see their dashboard content
    const hasClientContent =
      bodyText.includes('Dashboard') ||
      bodyText.includes('Tax Return') ||
      bodyText.includes('Documents');

    expect(hasClientContent).toBeTruthy();

    await page.screenshot({
      path: 'test-results/client-dashboard-content.png',
      fullPage: true,
    });

    await logout(page);
  });

  test('Lead dashboard shows pending approval message', async ({ page }) => {
    await loginWithCredentials(page, 'lead@test.com', 'lead123');
    await page.waitForURL(/dashboard\/lead/, { timeout: 15000 });

    const bodyText = (await page.textContent('body')) || '';

    // Lead should see pending approval content
    const hasLeadContent =
      bodyText.includes('Pending') ||
      bodyText.includes('Approval') ||
      bodyText.includes('Review') ||
      bodyText.includes('Application');

    expect(hasLeadContent).toBeTruthy();

    await page.screenshot({
      path: 'test-results/lead-dashboard-content.png',
      fullPage: true,
    });

    await logout(page);
  });
});
