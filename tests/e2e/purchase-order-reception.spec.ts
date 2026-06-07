import { test, expect } from '@playwright/test'

/**
 * Réception commande fournisseur — fixture PO-E2E-0001 (SENT, E2E_SEED=1).
 */
test.describe('Purchase order reception E2E', () => {
  async function getPurchaseOrderFixture(page: import('@playwright/test').Page) {
    const res = await page.request.get('/api/e2e/fixtures/e2e-purchase-order-id')
    if (res.status() === 404) return null
    const { purchaseOrderId } = await res.json()
    if (!purchaseOrderId) return null
    return { purchaseOrderId }
  }

  test('should receive partial quantity and show receipt history', async ({ page }) => {
    const fixtures = await getPurchaseOrderFixture(page)
    if (!fixtures) {
      test.skip(true, 'Fixture PO E2E indisponible (E2E_SEED ou PO-E2E-0001 absent)')
      return
    }

    const { purchaseOrderId } = fixtures
    await page.goto(`/admin/purchases/${purchaseOrderId}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('PO-E2E-0001', {
      timeout: 15000,
    })

    const receiveLink = page.getByRole('link', { name: 'Réceptionner' })
    if ((await receiveLink.count()) === 0) {
      const history = page.getByRole('heading', { name: 'Historique des réceptions' })
      if ((await history.count()) > 0) {
        test.skip(true, 'PO E2E déjà entièrement réceptionnée')
        return
      }
      test.skip(true, 'Bouton Réceptionner indisponible (statut ou rôle)')
      return
    }

    await receiveLink.click()
    await page.waitForURL(new RegExp(`/admin/purchases/${purchaseOrderId}/receive`), {
      timeout: 10000,
    })

    const qtyInput = page.locator('input[aria-label*="Quantité à réceptionner"]').first()
    await qtyInput.fill('1')
    await page.getByRole('button', { name: 'Valider la réception' }).click()

    await page.waitForURL(new RegExp(`/admin/purchases/${purchaseOrderId}$`), { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Historique des réceptions' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/Réception du/)).toBeVisible()
    await expect(page.getByText(/Part\. réceptionnée|Réceptionnée/)).toBeVisible()
  })
})
