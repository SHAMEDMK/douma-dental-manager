import { test, expect } from '@playwright/test'

test.describe('Order Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@douma.com')
    await page.fill('input[type="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin/)
  })

  test('should display orders list', async ({ page }) => {
    await page.goto('/admin/orders')
    
    // Should see orders table or empty state
    await expect(page.locator('h1, h2')).toContainText(/commandes|orders/i)
  })

  test('should change order status from CONFIRMED to PREPARED', async ({ page }) => {
    await page.goto('/admin/orders')
    
    // Find an order with CONFIRMED status
    // This is a template - actual selectors depend on your UI
    const confirmedOrder = page.locator('[data-status="CONFIRMED"]').first()
    
    if (await confirmedOrder.count() > 0) {
      // Click prepare button
      await confirmedOrder.locator('button:has-text("Préparer")').click()
      
      // Should show success message
      await expect(page.locator('text=/succès|success/i')).toBeVisible({ timeout: 5000 })
      
      // Status should update
      await expect(confirmedOrder.locator('[data-status]')).toHaveAttribute('data-status', 'PREPARED')
    }
  })

  test('should navigate to order details', async ({ page }) => {
    await page.goto('/admin/orders')
    
    // Click on first order (if exists)
    const firstOrder = page.locator('a, button').filter({ hasText: /détails|voir|view/i }).first()
    
    if (await firstOrder.count() > 0) {
      await firstOrder.click()
      
      // Should be on order detail page
      await expect(page).toHaveURL(/\/admin\/orders\/[^/]+$/)
    }
  })
})
