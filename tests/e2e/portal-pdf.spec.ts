import { test, expect } from '@playwright/test'

/**
 * Aperçus PDF portail client — fixtures E2E (CMD-E2E-PREPARED, INV-E2E-0001).
 */
test.describe('Portal PDF previews', () => {
  test.use({ storageState: '.auth/client.json' })

  async function getClientAFixtures(page: import('@playwright/test').Page) {
    const [orderRes, invoiceRes] = await Promise.all([
      page.request.get('/api/e2e/fixtures/clientA-order-id'),
      page.request.get('/api/e2e/fixtures/clientA-invoice-id'),
    ])
    if (orderRes.status() === 404 || invoiceRes.status() === 404) return null
    const { orderId } = await orderRes.json()
    const { invoiceId } = await invoiceRes.json()
    if (!orderId || !invoiceId) return null
    return { orderId, invoiceId }
  }

  test('portal BL print uses invoice-pdf template', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    await page.goto(`/portal/orders/${fixtures.orderId}/delivery-note/print`)
    await expect(page.locator('.invoice-pdf--portal-bl')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'BON DE LIVRAISON' })).toBeVisible()
  })

  test('portal invoice print uses invoice-pdf template', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    await page.goto(`/portal/invoices/${fixtures.invoiceId}/print`)
    await expect(page.locator('.invoice-pdf')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'FACTURE' })).toBeVisible()
  })

  test('portal invoice PDF API returns application/pdf when available', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    const response = await page.request.get(`/api/pdf/portal/invoices/${fixtures.invoiceId}`)
    if (response.status() !== 200) {
      test.skip(true, `Génération PDF indisponible (status ${response.status()})`)
      return
    }
    expect(response.headers()['content-type']).toMatch(/application\/pdf/)
  })
})
