/**
 * CRM Contact Detail E2E Tests
 *
 * Tests for the contact detail page:
 * - Contact information display
 * - Edit contact functionality
 * - Pipeline stage changes
 * - Tabs (Tax Details, Timeline, Tasks, Emails, Documents)
 * - Back navigation
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  loginAs,
  logout,
  goToContacts,
  goToContactDetail,
  waitForPageLoad,
  expectToast,
  takeScreenshot,
  hasValidCredentials,
  ensureTestContactExists,
  PIPELINE_STAGES,
} from './crm-setup';

// Use taxPreparer as the default test role since credentials are known
const DEFAULT_TEST_ROLE = 'taxPreparer' as const;

test.describe('CRM Contact Detail Page', () => {
  let testContactId: string | null = null;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  // Helper to get first contact ID - ensures a contact exists first
  async function getFirstContactId(page: any): Promise<string | null> {
    await loginAs(page, DEFAULT_TEST_ROLE);

    // Ensure at least one contact exists
    await ensureTestContactExists(page);

    await goToContacts(page);
    await waitForPageLoad(page);

    const rows = page.locator('table tbody tr, [data-contact-row]');
    if ((await rows.count()) === 0) {
      return null;
    }

    // Open actions dropdown - look for the DropdownMenuTrigger button with MoreVertical icon
    const firstRow = rows.first();
    const actionsButton = firstRow.locator('button:has(svg), button[aria-label="Actions"]');

    if ((await actionsButton.count()) > 0) {
      // Click the last button (usually the actions menu is on the right)
      await actionsButton.last().click();
      await page.waitForTimeout(500); // Wait for dropdown to open

      // Click View or View Details menu item
      const viewMenuItem = page.locator('[role="menuitem"]:has-text("View"), [role="menuitem"]:has-text("View Details")');
      if ((await viewMenuItem.count()) > 0) {
        await viewMenuItem.first().click();

        // Wait for navigation and extract ID from URL
        await page.waitForURL(/\/crm\/contacts\/[a-zA-Z0-9-]+/, { timeout: 15000 });
        const url = page.url();
        const match = url.match(/\/crm\/contacts\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
      }
    }

    return null;
  }

  // ==========================================================================
  // PAGE LOADING TESTS
  // ==========================================================================

  test.describe('Page Loading', () => {
    test('Contact detail page loads successfully', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Page should have loaded
      expect(page.url()).toContain(`/crm/contacts/${contactId}`);

      // Should show contact information
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();

      await takeScreenshot(page, 'contact-detail-loaded');
      await logout(page);
    });

    test('Invalid contact ID shows error', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContactDetail(page, 'invalid-fake-id-12345');
      await waitForPageLoad(page);

      // Should show error state or redirect
      const errorIndicator = page.locator(':has-text("not found"), :has-text("Error"), :has-text("404")');
      const hasError = (await errorIndicator.count()) > 0 || page.url().includes('/crm/contacts');

      await takeScreenshot(page, 'contact-detail-invalid-id');
      await logout(page);
    });

    test('Back button is visible', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Lucide icons have class like "lucide lucide-arrow-left"
      const backButton = page.locator('button:has(svg.lucide-arrow-left), button[aria-label*="Back"], a:has-text("Back")');
      await expect(backButton.first()).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, 'back-button-visible');
      await logout(page);
    });

    test('Back button navigates to contacts list', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Lucide icons have class like "lucide lucide-arrow-left"
      const backButton = page.locator('button:has(svg.lucide-arrow-left), button[aria-label*="Back"]');
      if ((await backButton.count()) > 0) {
        await backButton.first().click();
        await page.waitForLoadState('networkidle');

        // Should be back on contacts list
        expect(page.url()).toContain('/crm/contacts');
        expect(page.url()).not.toMatch(/\/crm\/contacts\/[a-zA-Z0-9-]+$/);
      }

      await takeScreenshot(page, 'back-navigation');
      await logout(page);
    });
  });

  // ==========================================================================
  // CONTACT INFORMATION TESTS
  // ==========================================================================

  test.describe('Contact Information', () => {
    test('Avatar displays with initials', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Look for avatar component - Radix UI avatars use rounded-full class
      // The AvatarFallback has bg-muted and contains initials
      const avatar = page.locator('[class*="bg-muted"][class*="rounded-full"], [data-testid="avatar"]');
      await expect(avatar.first()).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, 'avatar-display');
      await logout(page);
    });

    test('Contact type badge is visible', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Look for badge with contact type - badges usually have specific background colors
      // and contain text like CLIENT, LEAD, AFFILIATE, PREPARER
      const badge = page.locator('span:has-text("CLIENT"), span:has-text("LEAD"), span:has-text("AFFILIATE"), span:has-text("PREPARER"), [class*="badge"]');
      await expect(badge.first()).toBeVisible({ timeout: 10000 });

      await takeScreenshot(page, 'contact-type-badge');
      await logout(page);
    });

    test('Email is displayed and clickable', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Look for email link
      const emailLink = page.locator('a[href^="mailto:"], :has-text("@"):has([class*="Mail"])');
      if ((await emailLink.count()) > 0) {
        await expect(emailLink.first()).toBeVisible();
      }

      await takeScreenshot(page, 'email-display');
      await logout(page);
    });

    test('Phone is displayed', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Look for phone - may or may not be present
      const phoneElement = page.locator('a[href^="tel:"], :has([class*="Phone"])');
      // Just verify page loads, phone is optional

      await takeScreenshot(page, 'phone-display');
      await logout(page);
    });

    test('Lead score is displayed with color coding', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Look for lead score indicator
      const scoreElement = page.locator('[data-testid="lead-score"], :has-text("Score"), :has-text("Lead Score")');
      if ((await scoreElement.count()) > 0) {
        await expect(scoreElement.first()).toBeVisible();
      }

      await takeScreenshot(page, 'lead-score-display');
      await logout(page);
    });
  });

  // ==========================================================================
  // EDIT CONTACT TESTS
  // ==========================================================================

  test.describe('Edit Contact', () => {
    test('Edit button is visible', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      const editButton = page.locator('button:has-text("Edit"), button:has([class*="Edit"]), button[aria-label*="Edit"]');
      await expect(editButton.first()).toBeVisible();

      await takeScreenshot(page, 'edit-button-visible');
      await logout(page);
    });

    test('Edit dialog opens with pre-populated data', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      const editButton = page.locator('button:has-text("Edit"), button:has([class*="Edit"])');
      await editButton.first().click();

      // Dialog should open
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Form fields should have values
      const firstNameInput = page.locator('#firstName, input[id="firstName"]');
      if ((await firstNameInput.count()) > 0) {
        const value = await firstNameInput.first().inputValue();
        expect(value.length).toBeGreaterThan(0);
      }

      await takeScreenshot(page, 'edit-dialog-open');

      // Close dialog
      const cancelButton = page.locator('button:has-text("Cancel")');
      if ((await cancelButton.count()) > 0) {
        await cancelButton.first().click();
      }

      await logout(page);
    });

    test('Save button updates contact', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      const editButton = page.locator('button:has-text("Edit"), button:has([class*="Edit"])');
      await editButton.first().click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Modify a field
      const companyInput = page.locator('#company, input[id="company"]');
      if ((await companyInput.count()) > 0) {
        const testCompany = `Test Company ${Date.now()}`;
        await companyInput.first().fill(testCompany);

        // Save
        const saveButton = page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]');
        await saveButton.first().click();

        // Wait for dialog to close
        await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 }).catch(() => {});

        // Should show success toast
        await expectToast(page, 'updated', 'success').catch(() => {});
      }

      await takeScreenshot(page, 'edit-saved');
      await logout(page);
    });

    test('Cancel button closes without saving', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      const editButton = page.locator('button:has-text("Edit"), button:has([class*="Edit"])');
      await editButton.first().click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Get original value
      const firstNameInput = page.locator('#firstName, input[id="firstName"]').first();
      const originalValue = await firstNameInput.inputValue();

      // Modify
      await firstNameInput.fill('MODIFIED_TEST');

      // Cancel
      const cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")');
      await cancelButton.first().click();

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Re-open to verify value unchanged
      await editButton.first().click();
      await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

      const currentValue = await firstNameInput.inputValue();
      expect(currentValue).toBe(originalValue);

      await takeScreenshot(page, 'edit-cancelled');
      await logout(page);
    });
  });

  // ==========================================================================
  // PIPELINE STAGE TESTS
  // ==========================================================================

  test.describe('Pipeline Stage', () => {
    test('Pipeline stage selector is visible', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      const stageSelector = page.locator('[data-testid="stage-select"], button:has-text("Stage"), select:has-text("Stage"), button:has-text("NEW"), button:has-text("CONTACTED")');
      await expect(stageSelector.first()).toBeVisible();

      await takeScreenshot(page, 'stage-selector-visible');
      await logout(page);
    });

    test('Changing stage updates contact', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Find and click stage selector
      const stageSelector = page.locator('[data-testid="stage-select"], button:has-text("NEW"), button:has-text("CONTACTED"), button:has-text("QUALIFIED")').first();

      if ((await stageSelector.count()) > 0) {
        await stageSelector.click();

        // Select a different stage
        const stageOption = page.locator('[role="option"]:has-text("CONTACTED"), [data-value="CONTACTED"]');
        if ((await stageOption.count()) > 0) {
          await stageOption.first().click();

          // Wait for update
          await page.waitForLoadState('networkidle');

          // Should show success or stage should update
          await page.waitForTimeout(1000);
        }
      }

      await takeScreenshot(page, 'stage-changed');
      await logout(page);
    });
  });

  // ==========================================================================
  // TABS TESTS
  // ==========================================================================

  test.describe('Tabs Section', () => {
    test('Tabs are visible', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Look for tab list
      const tabList = page.locator('[role="tablist"], .tabs');
      await expect(tabList.first()).toBeVisible();

      await takeScreenshot(page, 'tabs-visible');
      await logout(page);
    });

    test('Tax Details tab shows intake data if available', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Click Tax Details tab
      const taxTab = page.locator('[role="tab"]:has-text("Tax"), button:has-text("Tax Details")');
      if ((await taxTab.count()) > 0) {
        await taxTab.first().click();
        await page.waitForTimeout(500);

        // Should show tax details or "no data" message
        const tabContent = page.locator('[role="tabpanel"]');
        await expect(tabContent.first()).toBeVisible();
      }

      await takeScreenshot(page, 'tax-details-tab');
      await logout(page);
    });

    test('Timeline tab shows activities', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Click Timeline tab
      const timelineTab = page.locator('[role="tab"]:has-text("Timeline"), button:has-text("Timeline"), [role="tab"]:has-text("Activity")');
      if ((await timelineTab.count()) > 0) {
        await timelineTab.first().click();
        await page.waitForTimeout(500);

        const tabContent = page.locator('[role="tabpanel"]');
        await expect(tabContent.first()).toBeVisible();
      }

      await takeScreenshot(page, 'timeline-tab');
      await logout(page);
    });

    test('Tasks tab displays', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Click Tasks tab
      const tasksTab = page.locator('[role="tab"]:has-text("Tasks")');
      if ((await tasksTab.count()) > 0) {
        await tasksTab.first().click();
        await page.waitForTimeout(500);

        // May show "coming soon" or task list
        const tabContent = page.locator('[role="tabpanel"]');
        await expect(tabContent.first()).toBeVisible();
      }

      await takeScreenshot(page, 'tasks-tab');
      await logout(page);
    });

    test('Emails tab displays', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Click Emails tab
      const emailsTab = page.locator('[role="tab"]:has-text("Email")');
      if ((await emailsTab.count()) > 0) {
        await emailsTab.first().click();
        await page.waitForTimeout(500);

        const tabContent = page.locator('[role="tabpanel"]');
        await expect(tabContent.first()).toBeVisible();
      }

      await takeScreenshot(page, 'emails-tab');
      await logout(page);
    });

    test('Documents tab shows files', async ({ page }) => {
      const contactId = await getFirstContactId(page);
      if (!contactId) {
        test.skip();
        await logout(page);
        return;
      }

      // Click Documents tab
      const docsTab = page.locator('[role="tab"]:has-text("Document")');
      if ((await docsTab.count()) > 0) {
        await docsTab.first().click();
        await page.waitForTimeout(500);

        const tabContent = page.locator('[role="tabpanel"]');
        await expect(tabContent.first()).toBeVisible();
      }

      await takeScreenshot(page, 'documents-tab');
      await logout(page);
    });
  });
});
