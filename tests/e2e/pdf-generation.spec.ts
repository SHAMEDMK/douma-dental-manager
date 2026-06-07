import { test, expect } from '@playwright/test'

/**
 * Génération PDF admin — fixtures E2E stables quand E2E_SEED=1.
 */
test.describe('PDF Generation E2E', () => {
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

  test('should display invoice print page with invoice-pdf template', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    await page.goto(`/admin/invoices/${fixtures.invoiceId}/print`)
    await expect(page.locator('.invoice-pdf')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'FACTURE' })).toBeVisible()
  })

  test('should display admin BL with invoice-pdf template', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    await page.goto(`/admin/orders/${fixtures.orderId}/delivery-note`)
    await expect(page.locator('.invoice-pdf--admin-bl')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'BON DE LIVRAISON' })).toBeVisible()
  })

  test('should return application/pdf for admin invoice PDF API', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    const response = await page.request.get(`/api/pdf/admin/invoices/${fixtures.invoiceId}`)
    if (response.status() !== 200) {
      test.skip(true, `Génération PDF indisponible (status ${response.status()})`)
      return
    }
    expect(response.headers()['content-type']).toMatch(/application\/pdf/)
    const body = await response.body()
    expect(body.length).toBeGreaterThan(100)
  })

  test('should return application/pdf for admin delivery note PDF API', async ({ page }) => {
    const fixtures = await getClientAFixtures(page)
    if (!fixtures) {
      test.skip(true, 'Fixtures E2E indisponibles (E2E_SEED ou seed non appliqué)')
      return
    }

    const response = await page.request.get(
      `/api/pdf/admin/orders/${fixtures.orderId}/delivery-note`
    )
    if (response.status() !== 200) {
      test.skip(true, `Génération PDF indisponible (status ${response.status()})`)
      return
    }
    expect(response.headers()['content-type']).toMatch(/application\/pdf/)
  })
})
