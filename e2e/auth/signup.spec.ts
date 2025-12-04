import { test, expect } from '@playwright/test'

test.describe('Signup Flow', () => {
  test('should display Clerk signup component', async ({ page }) => {
    await page.goto('http://localhost:3005/auth/signup')

    // Wait for Clerk SignUp component to load
    await page.waitForSelector('.cl-rootBox, [data-clerk-component="signUp"]', {
      timeout: 10000,
    })

    // Verify we're on the signup page
    expect(page.url()).toContain('/auth/signup')
  })

  test('should have proper page structure', async ({ page }) => {
    await page.goto('http://localhost:3005/auth/signup')

    // Check for centered layout
    const container = await page.locator('.flex.min-h-screen.items-center.justify-center')
    await expect(container).toBeVisible()
  })
})
