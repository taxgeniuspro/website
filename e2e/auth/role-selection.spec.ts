import { test, expect } from '@playwright/test'

test.describe('Role Selection', () => {
  test.skip('should display role selection page', async ({ page }) => {
    // Note: This test requires authentication to be set up first
    // Skipping for now as it requires Clerk test mode setup

    await page.goto('http://localhost:3005/auth/select-role')

    // Should see role selection title
    await expect(page.getByText('Select Your Role')).toBeVisible()

    // Should see all three role options
    await expect(page.getByText('Tax Client')).toBeVisible()
    await expect(page.getByText('Tax Preparer')).toBeVisible()
    await expect(page.getByText('Referrer')).toBeVisible()

    // Continue button should be disabled initially
    const continueButton = page.getByRole('button', { name: /continue/i })
    await expect(continueButton).toBeDisabled()
  })
})
