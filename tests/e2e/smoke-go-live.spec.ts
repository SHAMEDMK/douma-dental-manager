/**
 * Smoke go-live – E2E minimal critique "go/no-go".
 * Stable, pas de scraping fragile. Utilise storageState (admin, client, clientB) et baseURL.
 *
 * Why: valider avant/jour J que santé, RBAC, ownership, invoice lock, paiement et export guard
 * se comportent comme en prod. Messages attendus (régression) :
 * - 401 : "Non authentifié"
 * - 403 : "Accès refusé"
 * - 413 export : "Export refusé : trop de lignes (X > Y)..."
 * - Invoice lock : "Cette commande n'est plus modifiable"
 * - Paiement : "Paiement enregistré"
 */

import { test, expect } from '@playwright/test'

test.describe('Smoke go-live – admin session', () => {
  test.use({ storageState: '.auth/admin.json' })

  test('admin login state: /admin returns 200 and expected content', async ({ page }) => {
    const res = await page.goto('/admin')
    expect(res?.status()).toBe(200)
    await expect(
      page.locator('a[href*="/admin"]').or(page.getByText(/Commandes|Dashboard|Tableau de bord/i)).first()
    ).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Smoke go-live – no-auth RBAC', () => {
  test('no-auth: GET /api/admin/export/orders → 401 + Non authentifié', async ({ request }) => {
    const response = await request.get('/api/admin/export/orders')
    expect(response.status()).toBe(401)
    const body = await response.json().catch(() => ({}))
    expect(body?.error).toBe('Non authentifié')
  })
})

test.describe('Smoke go-live – ownership (clientB)', () => {
  test.use({ storageState: '.auth/clientB.json' })

  test('clientB: API PDF invoice clientA → 403 Accès refusé', async ({ page }) => {
    const fixtureRes = await page.request.get('/api/e2e/fixtures/clientA-invoice-id')
    if (fixtureRes.status() === 404) {
      test.skip(true, 'Fixture indisponible (E2E_SEED ou clientA-invoice-id absent)')
      return
    }
    const { invoiceId } = await fixtureRes.json().catch(() => ({}))
    if (!invoiceId) {
      test.skip(true, 'Fixture clientA-invoice-id invalide')
      return
    }
    const pdfRes = await page.request.get(`/api/pdf/portal/invoices/${invoiceId}`)
    expect(pdfRes.status()).toBe(403)
    const body = await pdfRes.json().catch(() => ({}))
    expect(body?.error).toBe('Accès refusé')
  })
})

test.describe('Smoke go-live – paiement après livraison (admin)', () => {
  test.use({ storageState: '.auth/admin.json' })

  test('admin: encaisser sur facture seed (INV-E2E-0001) → Paiement enregistré', async ({ page }) => {
    await page.goto('/admin/invoices')
    await page.waitForURL(/\/admin\/invoices/, { timeout: 15000 })
    const invoiceRow = page.locator('tr').filter({ hasText: 'INV-E2E-0001' })
    const count = await invoiceRow.count()
    if (count === 0) {
      test.skip(true, 'Facture seed INV-E2E-0001 absente (E2E_SEED ou seed non appliqué)')
      return
    }
    const encaisserBtn = invoiceRow.getByRole('button', { name: /encaisser/i }).first()
    const visible = await encaisserBtn.isVisible().catch(() => false)
    if (!visible) {
      test.skip(true, 'Aucun bouton Encaisser (solde 0 ou facture payée)')
      return
    }
    await encaisserBtn.click()
    const amountInput = page.getByLabel(/montant/i).first()
    await amountInput.fill('10')
    await page.getByRole('button', { name: /Confirmer/i }).click()
    await expect(page.getByText(/Paiement enregistré/i)).toBeVisible({ timeout: 8000 })
  })
})

test.describe('Smoke go-live – invoice lock (client)', () => {
  test.use({ storageState: '.auth/client.json' })

  test('client: annulation refusée when invoice PARTIAL → Cette commande n\'est plus modifiable', async ({
    page,
  }) => {
    await page.goto('/portal/orders')
    await page.waitForURL(/\/portal\/orders/, { timeout: 15000 })
    const cancelBtn = page.getByRole('button', { name: /Annuler la commande/i }).first()
    if ((await cancelBtn.count()) === 0) {
      test.skip(true, 'Aucune commande annulable avec facture PARTIAL en seed')
      return
    }
    await cancelBtn.click()
    await page.getByRole('button', { name: /Confirmer l'annulation/i }).click()
    await expect(page.getByText(/Cette commande n'est plus modifiable/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Smoke go-live – export guard 413 (admin)', () => {
  test.use({ storageState: '.auth/admin.json' })

  test('admin export: if 413 then message contains Export refusé / trop de lignes', async ({ request }) => {
    const response = await request.get('/api/admin/export/orders')
    if (response.status() === 413) {
      const body = await response.json().catch(() => ({}))
      expect(body?.error).toBeDefined()
      expect(String(body?.error)).toMatch(/Export refusé.*trop de lignes/)
      return
    }
    if (response.status() === 200) {
      test.skip(true, 'EXPORT_MAX_ROWS not 1 or no limit: export succeeded (413 check N/A)')
      return
    }
    expect(response.status(), 'Expected 200 or 413').toBe(200)
  })
})
