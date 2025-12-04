import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should display Clerk login component', async ({ page }) => {
    await page.goto('http://localhost:3005/auth/login')

    // Wait for Clerk SignIn component to load
    await page.waitForSelector('.cl-rootBox, [data-clerk-component="signIn"]', {
      timeout: 10000,
    })

    // Verify we're on the login page
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('http://localhost:3005/dashboard/client')

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('should have proper page structure', async ({ page }) => {
    await page.goto('http://localhost:3005/auth/login')

    // Check for centered layout
    const container = await page.locator('.flex.min-h-screen.items-center.justify-center')
    await expect(container).toBeVisible()
  })
})
