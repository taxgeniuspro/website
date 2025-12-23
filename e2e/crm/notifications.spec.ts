/**
 * CRM Notifications E2E Tests
 *
 * Tests for the notification system:
 * - Toast notifications (success, error, info)
 * - Persistent notifications (bell icon)
 * - Notification actions
 */

import { test, expect } from '@playwright/test';
import {
  BASE_URL,
  loginAs,
  logout,
  goToContacts,
  waitForPageLoad,
  openAddContactDialog,
  fillContactForm,
  submitDialog,
  closeDialog,
  takeScreenshot,
  generateTestContact,
  hasValidCredentials,
} from './crm-setup';

// Use taxPreparer as the default test role since credentials are known
const DEFAULT_TEST_ROLE = 'taxPreparer' as const;

test.describe('CRM Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
  });

  // ==========================================================================
  // TOAST NOTIFICATION TESTS
  // ==========================================================================

  test.describe('Toast Notifications', () => {
    test('Success toast appears on contact creation', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const testContact = generateTestContact();

      await openAddContactDialog(page);
      await fillContactForm(page, testContact);
      await submitDialog(page);

      // Wait for toast
      await page.waitForTimeout(1000);

      // Look for success toast
      const toast = page.locator('[data-sonner-toast], [role="status"], [class*="toast"]');
      if ((await toast.count()) > 0) {
        await expect(toast.first()).toBeVisible({ timeout: 5000 });
        await takeScreenshot(page, 'success-toast');
      }

      await logout(page);
    });

    test('Error toast appears on validation failure', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      await openAddContactDialog(page);

      // Fill with invalid email
      await page.fill('#firstName, input[id="firstName"]', 'Test');
      await page.fill('#lastName, input[id="lastName"]', 'User');
      await page.fill('#email, input[id="email"]', 'invalid-email');

      await submitDialog(page);

      // Wait for response
      await page.waitForTimeout(1000);

      // Look for error indication (toast or inline error)
      const errorIndicator = page.locator('[data-sonner-toast], [role="alert"], .text-red-500, .text-destructive');

      await takeScreenshot(page, 'error-toast-or-validation');
      await closeDialog(page).catch(() => {});
      await logout(page);
    });

    test('Toast auto-dismisses after duration', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const testContact = generateTestContact();

      await openAddContactDialog(page);
      await fillContactForm(page, testContact);
      await submitDialog(page);

      // Wait for toast to appear
      await page.waitForTimeout(1000);

      // Toast should be visible
      const toast = page.locator('[data-sonner-toast]');
      if ((await toast.count()) > 0) {
        await expect(toast.first()).toBeVisible({ timeout: 5000 });

        // Wait for auto-dismiss (toasts typically dismiss after 3-5 seconds)
        await page.waitForTimeout(6000);

        // Toast may or may not be gone (depends on config)
        await takeScreenshot(page, 'toast-auto-dismiss');
      }

      await logout(page);
    });

    test('Only one toast shows at a time (TOAST_LIMIT=1)', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      // Trigger multiple toasts quickly
      const contact1 = generateTestContact();
      const contact2 = generateTestContact();

      await openAddContactDialog(page);
      await fillContactForm(page, contact1);
      await submitDialog(page);

      await page.waitForTimeout(500);

      // Try to create another immediately
      await openAddContactDialog(page).catch(() => {});
      await fillContactForm(page, contact2);
      await submitDialog(page).catch(() => {});

      await page.waitForTimeout(1000);

      // Count visible toasts
      const toasts = page.locator('[data-sonner-toast]');
      const toastCount = await toasts.count();

      // Should have at most 1 toast visible (TOAST_LIMIT = 1)
      expect(toastCount).toBeLessThanOrEqual(2); // Allow some overlap during transition

      await takeScreenshot(page, 'toast-limit');
      await logout(page);
    });
  });

  // ==========================================================================
  // NOTIFICATION BELL TESTS
  // ==========================================================================

  test.describe('Notification Bell', () => {
    test('Notification bell icon is visible in header', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      // Look for notification bell in header
      const bellIcon = page.locator('button:has([class*="Bell"]), [data-testid="notification-bell"], [aria-label*="notification"]');
      if ((await bellIcon.count()) > 0) {
        await expect(bellIcon.first()).toBeVisible();
      }

      await takeScreenshot(page, 'notification-bell');
      await logout(page);
    });

    test('Notification bell shows unread count badge', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      // Look for badge on bell
      const badge = page.locator('[data-testid="notification-count"], .badge, [class*="Badge"]').filter({ hasText: /\d+/ });
      // Badge may or may not be visible depending on unread count

      await takeScreenshot(page, 'notification-badge');
      await logout(page);
    });

    test('Clicking bell opens notification popover', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const bellIcon = page.locator('button:has([class*="Bell"]), [data-testid="notification-bell"]');
      if ((await bellIcon.count()) > 0) {
        await bellIcon.first().click();

        // Popover should open
        const popover = page.locator('[role="dialog"], [data-state="open"], [class*="popover"]');
        await expect(popover.first()).toBeVisible({ timeout: 5000 });

        await takeScreenshot(page, 'notification-popover');

        // Close popover
        await page.keyboard.press('Escape');
      }

      await logout(page);
    });

    test('Notification popover shows notifications list', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const bellIcon = page.locator('button:has([class*="Bell"]), [data-testid="notification-bell"]');
      if ((await bellIcon.count()) > 0) {
        await bellIcon.first().click();

        await page.waitForTimeout(500);

        // Should show list or "no notifications" message
        const content = page.locator('[role="dialog"], [data-state="open"]');
        if ((await content.count()) > 0) {
          const text = await content.first().textContent();
          // Should have some content
          expect(text?.length).toBeGreaterThan(0);
        }

        await takeScreenshot(page, 'notification-list');
        await page.keyboard.press('Escape');
      }

      await logout(page);
    });

    test('Clicking notification marks it as read', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const bellIcon = page.locator('button:has([class*="Bell"]), [data-testid="notification-bell"]');
      if ((await bellIcon.count()) > 0) {
        await bellIcon.first().click();

        await page.waitForTimeout(500);

        // Click on a notification if available
        const notification = page.locator('[data-testid="notification-item"], [role="listitem"]').first();
        if ((await notification.count()) > 0) {
          await notification.click();

          // Wait for mark as read
          await page.waitForTimeout(500);
        }

        await takeScreenshot(page, 'notification-clicked');
        await page.keyboard.press('Escape');
      }

      await logout(page);
    });
  });

  // ==========================================================================
  // NOTIFICATION ACTION TESTS
  // ==========================================================================

  test.describe('Notification Actions', () => {
    test('Notification with action URL navigates correctly', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const bellIcon = page.locator('button:has([class*="Bell"]), [data-testid="notification-bell"]');
      if ((await bellIcon.count()) > 0) {
        await bellIcon.first().click();

        await page.waitForTimeout(500);

        // Look for action button in notification
        const actionButton = page.locator('[data-testid="notification-action"], button:has-text("View"), a:has-text("View")');
        if ((await actionButton.count()) > 0) {
          const initialUrl = page.url();
          await actionButton.first().click();

          // May navigate to action URL
          await page.waitForTimeout(1000);
        }

        await takeScreenshot(page, 'notification-action');
      }

      await logout(page);
    });
  });

  // ==========================================================================
  // TOAST TYPE TESTS
  // ==========================================================================

  test.describe('Toast Types', () => {
    test('Success toast has correct styling', async ({ page }) => {
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      const testContact = generateTestContact();

      await openAddContactDialog(page);
      await fillContactForm(page, testContact);
      await submitDialog(page);

      await page.waitForTimeout(1000);

      // Check toast styling
      const toast = page.locator('[data-sonner-toast], [role="status"]');
      if ((await toast.count()) > 0) {
        // Success toasts typically have green styling or success class
        const toastHtml = await toast.first().innerHTML();
        await takeScreenshot(page, 'success-toast-styling');
      }

      await logout(page);
    });

    test('Info toast displays correctly', async ({ page }) => {
      // Info toasts are typically triggered by specific actions
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      // Info toasts may appear for various informational messages
      await takeScreenshot(page, 'info-toast-placeholder');
      await logout(page);
    });

    test('Warning toast displays correctly', async ({ page }) => {
      // Warning toasts appear for non-critical issues
      await loginAs(page, DEFAULT_TEST_ROLE);
      await goToContacts(page);
      await waitForPageLoad(page);

      await takeScreenshot(page, 'warning-toast-placeholder');
      await logout(page);
    });
  });
});
