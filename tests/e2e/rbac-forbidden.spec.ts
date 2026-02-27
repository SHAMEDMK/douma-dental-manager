import { test, expect } from '@playwright/test'

/**
 * RBAC – Scénarios "forbidden" sur modules critiques.
 * Uses storageState from auth-setup (no UI login in these tests).
 *
 * 1) Export API : no-auth → 401
 * 2) Export clients : COMPTABLE → 403 (ADMIN only)
 * 3) Portal PDF invoice : COMPTABLE (wrong role) → 403
 * 4) Admin stock page : CLIENT → redirect (layout)
 *
 * Use E2E seed credentials only; never rely on production env vars.
 */

test.describe('RBAC Forbidden – no-auth', () => {
  test('no-auth: GET /api/admin/export/orders returns 401', async ({ request }) => {
    const response = await request.get('/api/admin/export/orders')
    expect(response.status()).toBe(401)
    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType.toLowerCase()).toMatch(/application\/json/)
    const body = await response.json()
    expect(body.error).toBe('Non authentifié')
  })
})

test.describe('RBAC Forbidden – COMPTABLE', () => {
  test.use({ storageState: '.auth/comptable.json' })

  test('COMPTABLE: GET /api/admin/export/clients returns 403 (ADMIN only)', async ({ page }) => {
    const response = await page.request.get('/api/admin/export/clients')
    expect(response.status()).toBe(403)
    const contentType = response.headers()['content-type'] ?? ''
    expect(contentType.toLowerCase()).toMatch(/application\/json/)
    const body = await response.json()
    expect(body.error).toBe('Accès refusé')
  })

  test('Portal PDF invoice: COMPTABLE gets 403 (role CLIENT required)', async ({ page }) => {
    const fixtureRes = await page.request.get('/api/e2e/fixtures/invoice-id')
    if (fixtureRes.status() === 404) {
      test.skip(true, 'Fixture indisponible (E2E_SEED ou facture INV-E2E-0001 absente)')
      return
    }
    const { invoiceId } = await fixtureRes.json()
    if (!invoiceId) {
      test.skip(true, 'Fixture invoice-id invalide')
      return
    }

    const pdfResponse = await page.request.get(`/api/pdf/portal/invoices/${invoiceId}`)
    expect(pdfResponse.status()).toBe(403)
    const body = await pdfResponse.json().catch(() => ({}))
    expect(body?.error).toBe('Accès refusé')
  })
})

test.describe('RBAC Forbidden – CLIENT', () => {
  test.use({ storageState: '.auth/client.json' })

  test('CLIENT accessing /admin/stock is redirected (layout)', async ({ page }) => {
    await page.goto('/admin/stock')
    await page.waitForLoadState('domcontentloaded')

    const url = page.url()
    const redirectedToLogin = url.includes('/login')
    const redirectedToPortal = url.includes('/portal')
    expect(redirectedToLogin || redirectedToPortal).toBe(true)

    if (redirectedToLogin) {
      await expect(page.locator('input[name="email"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()
    } else {
      expect(redirectedToPortal).toBe(true)
      await expect(page.locator('a[href*="/portal"]').first()).toBeVisible()
    }
  })
})
