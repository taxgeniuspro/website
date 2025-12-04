import { test, expect } from '@playwright/test';

/**
 * End-to-End Authentication Dashboard Tests
 *
 * This suite tests the complete authentication flow for all user roles:
 * 1. Login with test credentials
 * 2. Verify redirect to correct dashboard
 * 3. Check dashboard UI elements are visible
 * 4. Take screenshots for verification
 */

const BASE_URL = 'http://localhost:3005';

// Test accounts
const testAccounts = [
  {
    role: 'Admin',
    email: 'admin@test.com',
    password: 'admin123',
    expectedUrl: '/dashboard/admin',
    dashboardTitle: 'Admin Dashboard',
  },
  {
    role: 'Tax Preparer',
    email: 'preparer@test.com',
    password: 'preparer123',
    expectedUrl: '/dashboard/tax-preparer',
    dashboardTitle: 'Tax Preparer Dashboard',
  },
  {
    role: 'Affiliate',
    email: 'affiliate@test.com',
    password: 'affiliate123',
    expectedUrl: '/dashboard/affiliate',
    dashboardTitle: 'Affiliate Dashboard',
  },
  {
    role: 'Client',
    email: 'client@test.com',
    password: 'client123',
    expectedUrl: '/dashboard/client',
    dashboardTitle: 'Client Dashboard',
  },
  {
    role: 'Lead',
    email: 'lead@test.com',
    password: 'lead123',
    expectedUrl: '/dashboard/lead',
    dashboardTitle: 'Lead Dashboard',
  },
];

// Helper function to login
async function loginWithTestAccount(page, email: string, password: string) {
  // Navigate to test login page
  await page.goto(`${BASE_URL}/auth/test-login`);

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click submit button
  await page.click('button[type="submit"]');

  // Wait for navigation
  await page.waitForLoadState('networkidle');
}

test.describe('Authentication Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport size
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  for (const account of testAccounts) {
    test(`${account.role}: Should login and display dashboard`, async ({ page }) => {
      // Step 1: Login
      await loginWithTestAccount(page, account.email, account.password);

      // Step 2: Verify URL redirect
      await expect(page).toHaveURL(new RegExp(account.expectedUrl));

      // Step 3: Wait for dashboard to load
      await page.waitForTimeout(2000); // Give dashboard time to render

      // Step 4: Take screenshot
      await page.screenshot({
        path: `__tests__/screenshots/${account.role.toLowerCase().replace(' ', '-')}-dashboard.png`,
        fullPage: true,
      });

      // Step 5: Verify dashboard elements exist
      // Check for common dashboard elements
      const hasHeader = await page.locator('header, nav').count() > 0;
      expect(hasHeader).toBeTruthy();

      // Log success
      console.log(`✅ ${account.role} dashboard loaded successfully`);
    });
  }

  test('Admin: Should have admin-specific UI elements', async ({ page }) => {
    await loginWithTestAccount(page, 'admin@test.com', 'admin123');
    await page.waitForLoadState('networkidle');

    // Check for admin-specific elements
    const bodyText = await page.textContent('body');

    // Admin should have access to management features
    const hasAdminContent =
      bodyText?.includes('Admin') ||
      bodyText?.includes('Dashboard') ||
      bodyText?.includes('Users') ||
      bodyText?.includes('Analytics');

    expect(hasAdminContent).toBeTruthy();

    // Take detailed screenshot
    await page.screenshot({
      path: '__tests__/screenshots/admin-dashboard-detailed.png',
      fullPage: true,
    });
  });

  test('Tax Preparer: Should have preparer-specific UI elements', async ({ page }) => {
    await loginWithTestAccount(page, 'preparer@test.com', 'preparer123');
    await page.waitForLoadState('networkidle');

    // Check for preparer-specific elements
    const bodyText = await page.textContent('body');

    const hasPreparerContent =
      bodyText?.includes('Preparer') ||
      bodyText?.includes('Clients') ||
      bodyText?.includes('Dashboard');

    expect(hasPreparerContent).toBeTruthy();

    await page.screenshot({
      path: '__tests__/screenshots/tax-preparer-dashboard-detailed.png',
      fullPage: true,
    });
  });

  test('Affiliate: Should have affiliate-specific UI elements', async ({ page }) => {
    await loginWithTestAccount(page, 'affiliate@test.com', 'affiliate123');
    await page.waitForLoadState('networkidle');

    // Check for affiliate-specific elements
    const bodyText = await page.textContent('body');

    const hasAffiliateContent =
      bodyText?.includes('Affiliate') ||
      bodyText?.includes('Earnings') ||
      bodyText?.includes('Referrals') ||
      bodyText?.includes('Dashboard');

    expect(hasAffiliateContent).toBeTruthy();

    await page.screenshot({
      path: '__tests__/screenshots/affiliate-dashboard-detailed.png',
      fullPage: true,
    });
  });

  test('Client: Should have client-specific UI elements', async ({ page }) => {
    await loginWithTestAccount(page, 'client@test.com', 'client123');
    await page.waitForLoadState('networkidle');

    // Check for client-specific elements
    const bodyText = await page.textContent('body');

    const hasClientContent =
      bodyText?.includes('Client') ||
      bodyText?.includes('Tax Return') ||
      bodyText?.includes('Dashboard');

    expect(hasClientContent).toBeTruthy();

    await page.screenshot({
      path: '__tests__/screenshots/client-dashboard-detailed.png',
      fullPage: true,
    });
  });

  test('Lead: Should have lead-specific UI elements', async ({ page }) => {
    await loginWithTestAccount(page, 'lead@test.com', 'lead123');
    await page.waitForLoadState('networkidle');

    // Check for lead-specific elements
    const bodyText = await page.textContent('body');

    const hasLeadContent =
      bodyText?.includes('Lead') ||
      bodyText?.includes('Dashboard');

    expect(hasLeadContent).toBeTruthy();

    await page.screenshot({
      path: '__tests__/screenshots/lead-dashboard-detailed.png',
      fullPage: true,
    });
  });
});

test.describe('Test Login Page UI', () => {
  test('Should display test login page correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/test-login`);
    await page.waitForLoadState('networkidle');

    // Check page elements
    await expect(page.locator('text=Test Login')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Check quick test account buttons exist
    const quickButtons = page.locator('button:has-text("Admin"), button:has-text("Preparer")');
    const count = await quickButtons.count();
    expect(count).toBeGreaterThan(0);

    // Take screenshot
    await page.screenshot({
      path: '__tests__/screenshots/test-login-page.png',
      fullPage: true,
    });
  });

  test('Quick access buttons should fill credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/test-login`);
    await page.waitForLoadState('networkidle');

    // Click quick access button for admin
    await page.click('button:has-text("Admin")');

    // Wait a moment for the fields to fill
    await page.waitForTimeout(500);

    // Verify fields are filled
    const emailValue = await page.inputValue('input[type="email"]');
    const passwordValue = await page.inputValue('input[type="password"]');

    expect(emailValue).toBe('admin@test.com');
    expect(passwordValue).toBe('admin123');
  });
});
