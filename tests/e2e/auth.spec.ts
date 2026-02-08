import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login as admin', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await page.fill('input[name="email"]', 'admin@douma.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/admin/)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Wait for redirect to /login with error (full form POST navigation)
    await page.waitForURL(/\/login/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/login/)
    // Error message is shown from search params (may need a moment to render)
    await expect(
      page.getByText(/Identifiants invalides|Une erreur est survenue/i)
    ).toBeVisible({ timeout: 15000 })
  })
})
