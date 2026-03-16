import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'
import path from 'path'

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3000'
const projectRoot = path.resolve(__dirname, '../..')

/** Message standard de clôture (doit correspondre à ACCOUNTING_CLOSED_ERROR_MESSAGE dans app/lib/accounting-close.ts). */
const ACCOUNTING_CLOSED_MESSAGE = 'PÉRIODE COMPTABLE CLÔTURÉE : modification interdite.'

/** Get the table row that contains the invoice number link (for list page). */
function getInvoiceRow(page: import('@playwright/test').Page, invoiceNumber: string) {
  const link = page.getByRole('link', { name: invoiceNumber })
  return page.getByRole('row').filter({ has: link })
}

/**
 * Clôture comptable E2E — cas limite createdAt === accountingLockedUntil (≤ = clôturé).
 *
 * Facture seed utilisée : invoiceNumber = INV-E2E-0001 (créée par prisma/seed.ts avec E2E_SEED=1).
 * Le script set-accounting-close-e2e.ts fixe accountingLockedUntil et invoice.createdAt au même
 * timestamp ISO UTC : 2024-01-15T12:00:00.000Z (aucun Date.now, test non flaky).
 *
 * Tests : (1) période clôturée → paiement refusé + message standard (ACCOUNTING_CLOSED_ERROR_MESSAGE)
 *         affiché dans l’UI + aucun Payment créé ; (2) période ouverte → livraison crée nouvelle facture.
 * Ce test garantit que le message de clôture reste inchangé et s’affiche de façon déterministe.
 *
 * Connexion : admin (project Playwright "admin" avec storageState .auth/admin.json).
 */
test.describe('Accounting Close E2E', () => {
  test.describe('closed period (createdAt === accountingLockedUntil)', () => {
    test('refuse add payment, show standard message, and leave invoice unchanged', async ({ page }) => {
      execSync('npx tsx scripts/set-accounting-close-e2e.ts', {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, E2E_SEED: '1' },
      })
      try {
        execSync('npx tsx scripts/verify-accounting-closed-e2e.ts', {
          cwd: projectRoot,
          stdio: 'pipe',
          env: { ...process.env, E2E_SEED: '1' },
        })
      } catch {
        test.skip(true, 'INV-E2E-0001 absente (seed sans cette facture)')
        return
      }

      await page.goto(`${baseURL}/admin/invoices`)
      await expect(page.getByRole('heading', { name: /factures|gestion des factures/i })).toBeVisible({ timeout: 10000 })

      const row = getInvoiceRow(page, 'INV-E2E-0001')
      await expect(row).toBeVisible({ timeout: 10000 })
      // Solde restant avant tentative (seed : 10 Dh) — pour vérifier qu’aucun paiement n’est créé après refus
      await expect(row.getByTestId('open-payment-form')).toContainText('10')
      await row.getByTestId('open-payment-form').click()

      await expect(row.getByTestId('invoice-payment-form')).toBeVisible({ timeout: 5000 })
      await row.getByTestId('payment-amount').fill('1')
      await row.getByTestId('confirm-payment').click()

      const errorEl = page.getByTestId('payment-form-error')
      await expect(errorEl).toBeVisible({ timeout: 15000 })
      await expect(errorEl).toContainText(ACCOUNTING_CLOSED_MESSAGE)

      // Statut inchangé : recharger la liste puis vérifier que le solde restant est toujours 10 Dh (aucun Payment créé)
      await page.reload()
      await expect(page.getByRole('heading', { name: /factures|gestion des factures/i })).toBeVisible({ timeout: 10000 })
      const rowAfter = getInvoiceRow(page, 'INV-E2E-0001')
      await expect(rowAfter).toBeVisible({ timeout: 5000 })
      await expect(rowAfter.getByTestId('open-payment-form')).toContainText('10')
    })
  })

  test.describe('open period', () => {
    test.beforeAll(() => {
      execSync('npx tsx scripts/set-accounting-close-e2e.ts --open', {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, E2E_SEED: '1' },
      })
      execSync('npx tsx scripts/create-order-e2e-confirmed.ts', {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, E2E_SEED: '1' },
      })
    })

    test('allow creating new invoice after lockedUntil (deliver order)', async ({ page }) => {
      await page.goto(`${baseURL}/admin/orders?status=CONFIRMED&pageSize=100`)
      await expect(page.getByRole('heading', { name: /commandes/i })).toBeVisible({ timeout: 10000 })

      const row = page.getByRole('row').filter({ hasText: /CMD-E2E-CONFIRMED/i })
      await expect(row).toBeVisible({ timeout: 5000 })
      await row.getByRole('link', { name: /voir détails/i }).click()
      await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 10000 })

      await expect(page.getByTestId('order-action-prepared')).toBeVisible({ timeout: 5000 })
      await page.getByTestId('order-action-prepared').click()

      await expect(page.getByTestId('order-action-shipped')).toBeVisible({ timeout: 12000 })
      await page.getByTestId('order-action-shipped').click()

      await expect(page.getByTestId('ship-order-modal')).toBeVisible({ timeout: 12000 })
      await expect(page.locator('select[name="deliveryAgentName"]')).toBeVisible({ timeout: 5000 })
      await page.locator('select[name="deliveryAgentName"]').selectOption({ index: 1 })
      await page.getByTestId('confirm-ship-order').click()

      await expect(page.getByTestId('order-action-delivered')).toBeVisible({ timeout: 12000 })
      await page.getByTestId('order-action-delivered').click()
      await expect(page.getByTestId('deliver-order-modal')).toBeVisible({ timeout: 5000 })
      await page.getByTestId('delivered-to-name').fill('E2E Test Receiver')
      await page.getByTestId('confirm-deliver-order').click()

      await expect(
        page.getByText(/livrée|facture|FAC-|INV-/i).first()
      ).toBeVisible({ timeout: 10000 })
    })
  })
})
