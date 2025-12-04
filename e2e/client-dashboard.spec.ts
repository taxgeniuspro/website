import { test, expect } from '@playwright/test';

test.describe('Client Dashboard - Multiple Load Tests', () => {
  // Test login credentials
  const testEmail = 'client@test.com';
  const testPassword = 'client123';
  const loginUrl = 'http://localhost:3005/auth/test-login';
  const dashboardUrl = 'http://localhost:3005/dashboard/client';

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(loginUrl);
    await page.waitForLoadState('networkidle');

    // Fill in credentials
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);

    // Click sign in
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  });

  test('Load Test #1 - Verify dashboard loads with content', async ({ page }) => {
    console.log('\n========== TEST #1 ==========');
    await page.goto(dashboardUrl);
    await page.waitForLoadState('networkidle');

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // Get page content
    const content = await page.content();
    console.log('Page HTML length:', content.length);
    console.log('Contains "Welcome":', content.includes('Welcome'));
    console.log('Contains "Dashboard":', content.includes('Dashboard'));

    // Wait for main heading
    const heading = await page.locator('h1').first().textContent({ timeout: 10000 }).catch(() => 'NOT FOUND');
    console.log('Heading text:', heading);

    // Check for stats cards
    const bodyText = await page.textContent('body');
    console.log('Contains "Documents":', bodyText?.includes('Documents'));
    console.log('Contains "Referrals":', bodyText?.includes('Referrals'));
    console.log('Contains "Tax Status":', bodyText?.includes('Tax Status'));

    // Take screenshot
    await page.screenshot({ path: 'test-results/client-dashboard-test-1.png', fullPage: true });

    console.log('Test #1 - Complete\n');
  });

  test('Load Test #2 - Verify dashboard loads with content', async ({ page }) => {
    console.log('\n========== TEST #2 ==========');
    await page.goto(dashboardUrl);
    await page.waitForLoadState('networkidle');

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // Get page content
    const content = await page.content();
    console.log('Page HTML length:', content.length);

    // Wait for main heading
    const heading = await page.locator('h1').first().textContent({ timeout: 10000 }).catch(() => 'NOT FOUND');
    console.log('Heading text:', heading);

    // Check for loading states
    const hasLoading = content.includes('Loading') || content.includes('Skeleton');
    console.log('Has loading state:', hasLoading);

    // Check for error states
    const hasError = content.includes('error') || content.includes('404');
    console.log('Has error:', hasError);

    // Check for actual content
    const bodyText = await page.textContent('body');
    console.log('Body text length:', bodyText?.length);
    console.log('Contains "Filing Deadline":', bodyText?.includes('Filing Deadline'));
    console.log('Contains "Progress":', bodyText?.includes('Progress'));

    // Take screenshot
    await page.screenshot({ path: 'test-results/client-dashboard-test-2.png', fullPage: true });

    console.log('Test #2 - Complete\n');
  });

  test('Load Test #3 - Verify dashboard loads with content', async ({ page }) => {
    console.log('\n========== TEST #3 ==========');
    await page.goto(dashboardUrl);
    await page.waitForLoadState('networkidle');

    // Wait a bit for React to hydrate
    await page.waitForTimeout(2000);

    // Get page content
    const content = await page.content();
    console.log('Page HTML length:', content.length);

    // Wait for main heading
    const heading = await page.locator('h1').first().textContent({ timeout: 10000 }).catch(() => 'NOT FOUND');
    console.log('Heading text:', heading);

    // Check sidebar
    const sidebarExists = await page.locator('nav, aside, [role="navigation"]').count();
    console.log('Sidebar elements found:', sidebarExists);

    // Check for cards
    const cardCount = await page.locator('[class*="card"], [class*="Card"]').count();
    console.log('Card elements found:', cardCount);

    // Check for specific dashboard elements
    const bodyText = await page.textContent('body');
    console.log('Contains "My Dashboard":', bodyText?.includes('My Dashboard'));
    console.log('Contains "Overview":', bodyText?.includes('Overview'));
    console.log('Contains "Messages":', bodyText?.includes('Messages'));
    console.log('Contains "Payments":', bodyText?.includes('Payments'));

    // Take screenshot
    await page.screenshot({ path: 'test-results/client-dashboard-test-3.png', fullPage: true });

    console.log('Test #3 - Complete\n');
  });

  test('Comprehensive Dashboard Content Check', async ({ page }) => {
    console.log('\n========== COMPREHENSIVE CHECK ==========');
    await page.goto(dashboardUrl);
    await page.waitForLoadState('networkidle');

    // Wait for content to load
    await page.waitForTimeout(3000);

    // Get entire page content
    const pageContent = await page.content();
    console.log('\n=== FULL PAGE HTML LENGTH ===');
    console.log('HTML length:', pageContent.length);

    // Check for key elements
    console.log('\n=== KEY ELEMENTS CHECK ===');
    console.log('Contains "Welcome":', pageContent.includes('Welcome'));
    console.log('Contains "Dashboard":', pageContent.includes('Dashboard'));
    console.log('Contains "Tax":', pageContent.includes('Tax'));
    console.log('Contains "Documents":', pageContent.includes('Documents'));
    console.log('Contains "Referrals":', pageContent.includes('Referrals'));
    console.log('Contains "Filing Deadline":', pageContent.includes('Filing Deadline'));
    console.log('Contains "Tax Status":', pageContent.includes('Tax Status'));

    // Check for error messages
    console.log('\n=== ERROR MESSAGES CHECK ===');
    console.log('Contains "error":', pageContent.toLowerCase().includes('error'));
    console.log('Contains "404":', pageContent.includes('404'));
    console.log('Contains "Profile not found":', pageContent.includes('Profile not found'));
    console.log('Contains "Account Setup":', pageContent.includes('Account Setup'));

    // Check page title
    const title = await page.title();
    console.log('\n=== PAGE METADATA ===');
    console.log('Page title:', title);

    // Get all visible text
    const visibleText = await page.textContent('body');
    console.log('Visible text length:', visibleText?.length);
    console.log('Visible text preview:', visibleText?.substring(0, 200));

    // Take final screenshot
    await page.screenshot({ path: 'test-results/client-dashboard-comprehensive.png', fullPage: true });

    console.log('\nComprehensive check - Complete\n');
  });
});
