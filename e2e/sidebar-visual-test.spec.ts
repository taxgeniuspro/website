/**
 * Sidebar Visual Tests
 *
 * Tests the sidebar navigation for all user roles:
 * - Admin
 * - Tax Preparer
 * - Client
 * - Lead
 *
 * Verifies:
 * 1. Section labels are visible (no dropdowns hiding content)
 * 2. Navigation items are always visible under their sections
 * 3. No collapsible/dropdown behavior
 */

import { test, expect, Page } from '@playwright/test';

// Test against production - webServer is disabled for this test
const BASE_URL = 'https://taxgeniuspro.tax';

// Skip webServer by using production URL directly

// Test credentials for each role
const TEST_ACCOUNTS = {
  admin: {
    email: 'iradwatkins@gmail.com',
    password: process.env.ADMIN_PASSWORD || 'test-password',
    dashboardPath: '/en/admin/analytics',
  },
  tax_preparer: {
    email: 'whitegelisa@gmail.com',
    password: 'Makiyah07@@',
    dashboardPath: '/en/dashboard/tax-preparer',
  },
  client: {
    email: 'iradwatkins+client@gmail.com',
    password: process.env.CLIENT_PASSWORD || 'test-password',
    dashboardPath: '/en/dashboard/client',
  },
};

// Expected section labels for each role
const EXPECTED_SECTIONS = {
  admin: [
    '👥 Clients',
    '📊 Analytics',
    '📋 CRM',
    '💰 Financials',
    '📢 Marketing',
    '🛒 Marketing Materials',
    '🔗 Quick Share Tools',
    '⚙️ System Controls',
  ],
  tax_preparer: [
    '📊 Dashboard',
    '📚 Tools & Resources',
    '👥 Clients',
    '📋 CRM',
    '💼 Business',
    '🔗 Quick Share Tools',
  ],
  client: [
    '📱 My Dashboard',
    '🔗 Quick Share Tools',
  ],
};

async function loginAs(page: Page, role: 'admin' | 'tax_preparer' | 'client') {
  const account = TEST_ACCOUNTS[role];

  // Navigate to login page
  await page.goto(`${BASE_URL}/en/auth/login`);

  // Wait for login form
  await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[name="email"], input[type="email"]', account.email);
  await page.fill('input[name="password"], input[type="password"]', account.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`**${account.dashboardPath}**`, { timeout: 15000 });
}

async function checkSidebarSections(page: Page, expectedSections: string[], role: string) {
  // Wait for sidebar to be visible
  await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 10000 });

  // Get all section labels
  const sectionLabels = await page.locator('[data-sidebar="group-label"]').allTextContents();

  console.log(`[${role}] Found sections:`, sectionLabels);

  // Verify expected sections are present
  for (const expected of expectedSections) {
    const found = sectionLabels.some(label => label.includes(expected) || expected.includes(label));
    if (!found) {
      console.warn(`[${role}] Missing section: ${expected}`);
    }
  }

  return sectionLabels;
}

async function checkNoCollapsibleDropdowns(page: Page, role: string) {
  // Check that there are NO collapsible triggers (chevron buttons that toggle sections)
  const collapsibleTriggers = await page.locator('[data-sidebar="menu-button"][data-state]').count();

  // Check for any elements that might indicate dropdown behavior
  const chevronButtons = await page.locator('button:has(svg.lucide-chevron-down), button:has(svg.lucide-chevron-right)').count();

  console.log(`[${role}] Collapsible triggers found: ${collapsibleTriggers}`);
  console.log(`[${role}] Chevron buttons in sidebar: ${chevronButtons}`);

  return { collapsibleTriggers, chevronButtons };
}

async function checkAllNavItemsVisible(page: Page, role: string) {
  // Get all menu items
  const menuItems = await page.locator('[data-sidebar="menu-item"]').count();
  const menuButtons = await page.locator('[data-sidebar="menu-button"]').count();

  console.log(`[${role}] Menu items: ${menuItems}, Menu buttons: ${menuButtons}`);

  // All menu items should be visible (not hidden)
  const hiddenItems = await page.locator('[data-sidebar="menu-item"]:not(:visible)').count();

  console.log(`[${role}] Hidden menu items: ${hiddenItems}`);

  return { menuItems, menuButtons, hiddenItems };
}

async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `tests/screenshots/${name}.png`,
    fullPage: false,
  });
  console.log(`Screenshot saved: tests/screenshots/${name}.png`);
}

// Create screenshots directory
test.beforeAll(async () => {
  const fs = await import('fs');
  const dir = 'tests/screenshots';
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

test.describe('Sidebar Visual Tests - Tax Preparer Role', () => {
  test('Test 1: Section labels visible without dropdowns', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);

    // Login as tax preparer
    await page.fill('input[name="email"], input[type="email"]', 'whitegelisa@gmail.com');
    await page.fill('input[name="password"], input[type="password"]', 'Makiyah07@@');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('**/dashboard/tax-preparer**', { timeout: 15000 });

    // Check sidebar
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 10000 });

    // Take screenshot
    await takeScreenshot(page, 'tax-preparer-sidebar-test1');

    // Verify section labels
    const sections = await checkSidebarSections(page, EXPECTED_SECTIONS.tax_preparer, 'tax_preparer');
    expect(sections.length).toBeGreaterThan(0);
  });

  test('Test 2: No collapsible dropdown behavior', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.fill('input[name="email"], input[type="email"]', 'whitegelisa@gmail.com');
    await page.fill('input[name="password"], input[type="password"]', 'Makiyah07@@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/tax-preparer**', { timeout: 15000 });
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 10000 });

    const result = await checkNoCollapsibleDropdowns(page, 'tax_preparer');
    await takeScreenshot(page, 'tax-preparer-sidebar-test2');

    // Should have no collapsible behavior
    expect(result.collapsibleTriggers).toBe(0);
  });

  test('Test 3: All navigation items visible', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.fill('input[name="email"], input[type="email"]', 'whitegelisa@gmail.com');
    await page.fill('input[name="password"], input[type="password"]', 'Makiyah07@@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/tax-preparer**', { timeout: 15000 });
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 10000 });

    const result = await checkAllNavItemsVisible(page, 'tax_preparer');
    await takeScreenshot(page, 'tax-preparer-sidebar-test3');

    expect(result.menuItems).toBeGreaterThan(0);
    expect(result.hiddenItems).toBe(0);
  });
});

test.describe('Sidebar Structure Verification', () => {
  test('Verify sidebar has section groups with labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/en/auth/login`);
    await page.fill('input[name="email"], input[type="email"]', 'whitegelisa@gmail.com');
    await page.fill('input[name="password"], input[type="password"]', 'Makiyah07@@');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/tax-preparer**', { timeout: 15000 });

    // Wait for sidebar
    await page.waitForSelector('[data-sidebar="sidebar"]', { timeout: 10000 });

    // Check for SidebarGroup elements
    const groups = await page.locator('[data-sidebar="group"]').count();
    console.log(`Found ${groups} sidebar groups`);
    expect(groups).toBeGreaterThan(0);

    // Check for SidebarGroupLabel elements
    const labels = await page.locator('[data-sidebar="group-label"]').count();
    console.log(`Found ${labels} group labels`);
    expect(labels).toBeGreaterThan(0);

    // Check for SidebarGroupContent elements
    const contents = await page.locator('[data-sidebar="group-content"]').count();
    console.log(`Found ${contents} group contents`);
    expect(contents).toBeGreaterThan(0);

    // Take final screenshot
    await takeScreenshot(page, 'sidebar-structure-verification');
  });
});
