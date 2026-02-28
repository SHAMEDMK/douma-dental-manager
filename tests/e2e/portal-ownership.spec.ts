import { test, expect } from '@playwright/test'

/**
 * Portal ownership: CLIENT can access only their own resources.
 * - clientA = client@dental.com (has order CMD-E2E-PREPARED + invoice INV-E2E-0001)
 * - clientB = clientB@dental.com (must not access clientA's order/invoice)
 *
 * Convention (see docs/E2E_OWNERSHIP_CONVENTION.md):
 * - API routes (PDF, etc.): 403 + { error: "Accès refusé" }
 * - Portal pages (invoices, orders): 404 (notFound) to avoid revealing existence
 * - Server actions: { error: "Non authentifié" } ou { error: "Accès refusé" } (aligné API)
 *
 * Tests use E2E fixtures (clientA-order-id, clientA-invoice-id); no UI scraping.
 */
test.describe('Portal ownership – clientB cannot access clientA resources', () => {
  test.use({ storageState: '.auth/clientB.json' })

  test('API PDF invoice: clientB GET clientA invoice → 403 Accès refusé', async ({ page }) => {
    const res = await page.request.get('/api/e2e/fixtures/clientA-invoice-id')
    if (res.status() === 404) {
      test.skip(true, 'Fixture indisponible (E2E_SEED ou clientA-invoice-id absent)')
      return
    }
    const { invoiceId } = await res.json()
    if (!invoiceId) {
      test.skip(true, 'Fixture clientA-invoice-id invalide')
      return
    }

    const pdfRes = await page.request.get(`/api/pdf/portal/invoices/${invoiceId}`)
    expect(pdfRes.status()).toBe(403)
    const body = await pdfRes.json().catch(() => ({}))
    expect(body?.error).toBe('Accès refusé')
  })

  test('API PDF delivery-note: clientB GET clientA order BL → 403 Accès refusé', async ({ page }) => {
    const res = await page.request.get('/api/e2e/fixtures/clientA-order-id')
    if (res.status() === 404) {
      test.skip(true, 'Fixture indisponible (E2E_SEED ou clientA-order-id absent)')
      return
    }
    const { orderId } = await res.json()
    if (!orderId) {
      test.skip(true, 'Fixture clientA-order-id invalide')
      return
    }

    const pdfRes = await page.request.get(`/api/pdf/portal/orders/${orderId}/delivery-note`)
    expect(pdfRes.status()).toBe(403)
    const body = await pdfRes.json().catch(() => ({}))
    expect(body?.error).toBe('Accès refusé')
  })

  test('Portal invoice page: clientB GET clientA invoice page → 404', async ({ page }) => {
    const res = await page.request.get('/api/e2e/fixtures/clientA-invoice-id')
    if (res.status() === 404) {
      test.skip(true, 'Fixture indisponible (E2E_SEED ou clientA-invoice-id absent)')
      return
    }
    const { invoiceId } = await res.json()
    if (!invoiceId) {
      test.skip(true, 'Fixture clientA-invoice-id invalide')
      return
    }

    const navRes = await page.goto(`/portal/invoices/${invoiceId}`)
    expect(navRes?.status()).toBe(404)
  })
})
