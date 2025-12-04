import { test, expect } from '@playwright/test'

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing client dashboard unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:3005/dashboard/client')

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect to login when accessing preparer dashboard unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:3005/dashboard/preparer')

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('should redirect to login when accessing affiliate dashboard unauthenticated', async ({ page }) => {
    await page.goto('http://localhost:3005/dashboard/affiliate')

    // Should redirect to login
    await page.waitForURL('**/auth/login**', { timeout: 5000 })
    expect(page.url()).toContain('/auth/login')
  })

  test('should allow access to public routes', async ({ page }) => {
    // Homepage should be accessible
    await page.goto('http://localhost:3005/')
    expect(page.url()).toBe('http://localhost:3005/')

    // Login page should be accessible
    await page.goto('http://localhost:3005/auth/login')
    expect(page.url()).toContain('/auth/login')

    // Signup page should be accessible
    await page.goto('http://localhost:3005/auth/signup')
    expect(page.url()).toContain('/auth/signup')
  })
})
