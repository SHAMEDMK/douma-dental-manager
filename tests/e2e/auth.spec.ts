import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should login as admin', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in login form
    await page.fill('input[type="email"]', 'admin@douma.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    
    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/\/admin/)
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=/erreur|invalid|incorrect/i')).toBeVisible()
  })
})
