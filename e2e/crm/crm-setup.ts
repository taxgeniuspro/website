/**
 * CRM E2E Test Setup
 *
 * Shared utilities for CRM page testing:
 * - Authentication helpers for all roles
 * - Page object patterns for CRM components
 * - Common test data and fixtures
 */

import { Page, expect } from '@playwright/test';

// Use production URL since project is production-only
export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://taxgeniuspro.tax';

/**
 * Test accounts for different roles
 *
 * Required environment variables for full test coverage:
 * - TEST_ADMIN_PASSWORD: Password for admin account (iradwatkins@gmail.com)
 * - TEST_PREPARER_PASSWORD: Password for tax preparer account (whitegelisa@gmail.com)
 * - TEST_CLIENT_PASSWORD: Password for client account (testclient@example.com)
 *
 * If passwords are not set, tests for those roles will be skipped.
 */
export const TEST_ACCOUNTS = {
  admin: {
    email: 'iradwatkins@gmail.com',
    password: process.env.TEST_ADMIN_PASSWORD || '',
    dashboardUrl: '/dashboard/admin',
    canAccessCRM: true,
    canDeleteContacts: true,
    canCreateUsers: true,
    canChangeRoles: true,
  },
  taxPreparer: {
    email: 'whitegelisa@gmail.com',
    password: process.env.TEST_PREPARER_PASSWORD || 'Makiyah07@@',
    dashboardUrl: '/dashboard/tax-preparer',
    canAccessCRM: true,
    canDeleteContacts: false,
    canCreateUsers: false,
    canChangeRoles: false,
  },
  client: {
    email: 'testclient@example.com',
    password: process.env.TEST_CLIENT_PASSWORD || '',
    dashboardUrl: '/dashboard/client',
    canAccessCRM: false,
    canDeleteContacts: false,
    canCreateUsers: false,
    canChangeRoles: false,
  },
};

/**
 * Check if a test account has valid credentials
 */
export function hasValidCredentials(role: keyof typeof TEST_ACCOUNTS): boolean {
  return TEST_ACCOUNTS[role].password.length > 0;
}

// CRM URLs
export const CRM_URLS = {
  contacts: '/en/crm/contacts',
  contactDetail: (id: string) => `/en/crm/contacts/${id}`,
  marketingAssets: '/en/crm/marketing-assets',
};

// Pipeline stages
export const PIPELINE_STAGES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'DOCUMENTS',
  'FILED',
  'CLOSED',
  'LOST',
] as const;

// Contact types
export const CONTACT_TYPES = ['CLIENT', 'LEAD', 'AFFILIATE', 'PREPARER'] as const;

/**
 * Login with credentials
 */
export async function login(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.waitForLoadState('networkidle');

  // The signin page has email and password inputs always visible
  // Find the email input in the credentials form (not the magic link email input)
  // The credentials form has placeholder "Email address" while magic link has "Enter email for magic link"
  const emailInput = page.locator('input[type="email"][placeholder*="Email address"], input[autocomplete="email"]');
  await emailInput.first().waitFor({ state: 'visible', timeout: 10000 });

  // Fill email
  await emailInput.first().fill(email);

  // Find and fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.first().waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.first().fill(password);

  // Submit - click the Sign In button (not Sign in with Google or Magic Link)
  // The credentials submit button has the Lock icon and says "Sign In"
  const submitButton = page.locator('button[type="submit"]:has-text("Sign In")');
  await submitButton.click();

  // Wait for navigation - should redirect away from signin page
  await page.waitForLoadState('networkidle');

  // Give extra time for client-side navigation
  await page.waitForTimeout(2000);
}

/**
 * Login as specific role
 */
export async function loginAs(
  page: Page,
  role: keyof typeof TEST_ACCOUNTS
): Promise<void> {
  const account = TEST_ACCOUNTS[role];
  await login(page, account.email, account.password);

  // Wait for any dashboard redirect (be flexible about the exact path)
  // The user might be redirected to /dashboard/admin, /admin, /dashboard, etc.
  try {
    await page.waitForURL(/dashboard|admin|crm|home/, {
      timeout: 30000,
    });
  } catch {
    // If no redirect, check if we're still on signin (login failed)
    const url = page.url();
    if (url.includes('/auth/signin') || url.includes('/auth/login')) {
      // Check for error message
      const errorAlert = page.locator('[role="alert"], .text-destructive, .text-red-500');
      const hasError = (await errorAlert.count()) > 0;
      if (hasError) {
        const errorText = await errorAlert.first().textContent();
        throw new Error(`Login failed for ${account.email} - ${errorText || 'Invalid credentials'}`);
      }
      throw new Error(`Login failed for ${account.email} - still on signin page`);
    }
    // Otherwise, assume we're logged in somewhere
  }
}

/**
 * Logout
 */
export async function logout(page: Page): Promise<void> {
  try {
    await page.goto(`${BASE_URL}/auth/signout`);
    await page.waitForLoadState('networkidle');

    const signoutButton = page.locator(
      'button:has-text("Sign out"), button:has-text("Logout")'
    );
    if ((await signoutButton.count()) > 0) {
      await signoutButton.first().click();
      await page.waitForLoadState('networkidle');
    }
  } catch {
    await page.goto(`${BASE_URL}/`);
  }
}

/**
 * Navigate to CRM Contacts page
 */
export async function goToContacts(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}${CRM_URLS.contacts}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to Contact Detail page
 */
export async function goToContactDetail(page: Page, contactId: string): Promise<void> {
  await page.goto(`${BASE_URL}${CRM_URLS.contactDetail(contactId)}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to Marketing Assets page
 */
export async function goToMarketingAssets(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}${CRM_URLS.marketingAssets}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for page to be fully loaded (no loading spinners)
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  // Wait for loading spinners to disappear
  await page.waitForSelector('[class*="animate-spin"]', {
    state: 'hidden',
    timeout: 10000,
  }).catch(() => {});

  // Wait for skeleton loaders to disappear
  await page.waitForSelector('[class*="skeleton"]', {
    state: 'hidden',
    timeout: 10000,
  }).catch(() => {});
}

/**
 * Check if toast notification is visible with specific message
 */
export async function expectToast(
  page: Page,
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
): Promise<void> {
  const toastSelector = '[data-sonner-toast], [role="status"]';
  await expect(page.locator(toastSelector).filter({ hasText: message })).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Wait for toast to disappear
 */
export async function waitForToastDismiss(page: Page): Promise<void> {
  await page.waitForSelector('[data-sonner-toast]', {
    state: 'hidden',
    timeout: 10000,
  }).catch(() => {});
}

/**
 * Click Add Contact button and wait for dialog
 */
export async function openAddContactDialog(page: Page): Promise<void> {
  await page.click('button:has-text("Add Contact")');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

/**
 * Fill Add Contact form
 */
export async function fillContactForm(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    contactType?: string;
  }
): Promise<void> {
  // Wait for dialog to be fully visible
  await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 });

  // Use id selectors based on actual form implementation
  const firstNameInput = page.locator('#firstName, input[id="firstName"]');
  await firstNameInput.waitFor({ state: 'visible', timeout: 5000 });
  await firstNameInput.fill(data.firstName);

  const lastNameInput = page.locator('#lastName, input[id="lastName"]');
  await lastNameInput.fill(data.lastName);

  const emailInput = page.locator('#email, input[id="email"]');
  await emailInput.fill(data.email);

  if (data.phone) {
    const phoneInput = page.locator('#phone, input[id="phone"]');
    await phoneInput.fill(data.phone);
  }

  if (data.contactType) {
    // Click the Select trigger to open dropdown
    const selectTrigger = page.locator('[role="dialog"] button[role="combobox"]');
    await selectTrigger.click();
    await page.waitForTimeout(300);

    // Select the option by value or text
    const option = page.locator(`[role="option"][data-value="${data.contactType}"], [role="option"]:has-text("${data.contactType}")`);
    await option.first().click();
  }
}

/**
 * Submit dialog form
 */
export async function submitDialog(page: Page): Promise<void> {
  // Find and click the submit button (Add Contact, Save, or Create)
  const submitButton = page.locator('[role="dialog"] button:has-text("Add Contact"), [role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Create")');
  await submitButton.first().click();
}

/**
 * Close dialog
 */
export async function closeDialog(page: Page): Promise<void> {
  await page.click('[role="dialog"] button:has-text("Cancel"), [role="dialog"] button[aria-label="Close"]');
  await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 5000 });
}

/**
 * Get contact row by email
 */
export async function getContactRow(page: Page, email: string) {
  return page.locator(`tr:has-text("${email}"), [data-contact-email="${email}"]`).first();
}

/**
 * Open contact actions menu
 */
export async function openContactActionsMenu(page: Page, email: string): Promise<void> {
  const row = await getContactRow(page, email);
  await row.locator('button[aria-label="Actions"], button:has([class*="MoreVertical"])').click();
  await page.waitForSelector('[role="menu"]', { timeout: 5000 });
}

/**
 * Change pipeline stage for a contact
 */
export async function changePipelineStage(
  page: Page,
  email: string,
  newStage: (typeof PIPELINE_STAGES)[number]
): Promise<void> {
  const row = await getContactRow(page, email);
  await row.locator('[data-testid="stage-select"], button:has-text("Stage")').click();
  await page.click(`[data-value="${newStage}"], [role="option"]:has-text("${newStage}")`);
}

/**
 * Search contacts
 */
export async function searchContacts(page: Page, searchTerm: string): Promise<void> {
  await page.fill('input[placeholder*="Search"], input[type="search"]', searchTerm);
  // Wait for debounced search
  await page.waitForTimeout(500);
  await page.waitForLoadState('networkidle');
}

/**
 * Filter by stage
 */
export async function filterByStage(
  page: Page,
  stage: (typeof PIPELINE_STAGES)[number] | 'all'
): Promise<void> {
  await page.click('[data-testid="stage-filter"], button:has-text("Stage")');
  await page.click(`[data-value="${stage}"], [role="option"]:has-text("${stage}")`);
  await page.waitForLoadState('networkidle');
}

/**
 * Filter by contact type
 */
export async function filterByType(
  page: Page,
  type: (typeof CONTACT_TYPES)[number] | 'all'
): Promise<void> {
  await page.click('[data-testid="type-filter"], button:has-text("Type")');
  await page.click(`[data-value="${type}"], [role="option"]:has-text("${type}")`);
  await page.waitForLoadState('networkidle');
}

/**
 * Clear all filters
 */
export async function clearFilters(page: Page): Promise<void> {
  const clearButton = page.locator('button:has-text("Clear")');
  if ((await clearButton.count()) > 0) {
    await clearButton.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Get stats card value
 */
export async function getStatsCardValue(page: Page, cardTitle: string): Promise<string> {
  const card = page.locator(`[data-testid="stats-card"]:has-text("${cardTitle}"), .card:has-text("${cardTitle}")`);
  const value = await card.locator('[data-testid="stats-value"], .text-2xl, .text-3xl').textContent();
  return value?.trim() || '0';
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/crm-${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate test contact data
 */
export function generateTestContact() {
  const timestamp = Date.now();
  return {
    firstName: `Test${timestamp}`,
    lastName: `Contact${timestamp}`,
    email: generateTestEmail(),
    phone: '555-0100',
    contactType: 'LEAD' as const,
  };
}

/**
 * Ensure at least one test contact exists for the tax preparer
 * This creates a contact via the UI if no contacts exist
 */
export async function ensureTestContactExists(page: Page): Promise<boolean> {
  await goToContacts(page);
  await waitForPageLoad(page);

  // Check if any contacts exist
  const noContactsMessage = page.locator('text=No contacts found');
  const hasNoContacts = (await noContactsMessage.count()) > 0;

  if (hasNoContacts) {
    // Create a test contact
    const testContact = generateTestContact();

    await openAddContactDialog(page);
    await fillContactForm(page, testContact);
    await submitDialog(page);

    // Wait for creation
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle');

    // Refresh to see new contact
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForPageLoad(page);

    return true; // Contact was created
  }

  return false; // Contacts already exist
}

/**
 * Get the first contact ID from the contacts list
 * Returns null if no contacts exist
 */
export async function getFirstContactId(page: Page): Promise<string | null> {
  await goToContacts(page);
  await waitForPageLoad(page);

  const rows = page.locator('table tbody tr, [data-contact-row]');
  if ((await rows.count()) === 0) {
    return null;
  }

  // Click first row to navigate to detail
  const firstRow = rows.first();
  const contactCell = firstRow.locator('td').first();
  await contactCell.click();

  // Wait for navigation and extract ID from URL
  await page.waitForURL(/\/crm\/contacts\/[a-zA-Z0-9-]+/, { timeout: 10000 });
  const url = page.url();
  const match = url.match(/\/crm\/contacts\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}
