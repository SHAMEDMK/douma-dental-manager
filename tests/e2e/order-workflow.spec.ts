import { test, expect } from '@playwright/test'

test.describe('Order Workflow E2E', () => {
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
    
    // Click "Voir détails" of first order (not the "Voir" BL link which opens in new tab)
    const orderDetailLink = page.getByRole('link', { name: 'Voir détails' }).first()
    
    if (await orderDetailLink.count() > 0) {
      await orderDetailLink.click()
      await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 8000 })
      await expect(page).toHaveURL(/\/admin\/orders\/[^/]+$/)
    }
  })
})
