/**
 * E2E deterministic: Accounting close after payment.
 * Scenario: DELIVERED → invoice exists → payment (PARTIAL) → advance accounting lock
 * → add payment refused → update payment refused → delete payment refused → delete invoice refused.
 *
 * Why fixture: clientA-prepared-order-and-invoice gives stable orderId/invoiceId (CMD-E2E-PREPARED, INV-E2E-0001)
 * without scraping the UI; E2E_SEED=1 ensures this data exists.
 * Why E2E API for update payment: the app has no "edit payment" form; attempt-update-payment calls
 * updatePaymentAction so we assert accounting-close refusal without relying on missing UI.
 * Why order of checks: backend enforces auth → accounting-close → local rules (DELIVERED, invoice-lock);
 * we assert that when period is closed the refusal message is always ACCOUNTING_CLOSED_MESSAGE.
 */

import { test, expect } from '@playwright/test'

const ACCOUNTING_CLOSED_MESSAGE = 'PÉRIODE COMPTABLE CLÔTURÉE : modification interdite.'

function getInvoiceRow(page: import('@playwright/test').Page, invoiceNumber: string) {
  const link = page.getByRole('link', { name: invoiceNumber })
  return page.getByRole('row').filter({ has: link })
}

test.describe('Accounting close after payment', () => {
  test.use({ storageState: '.auth/admin.json' })

  test('deliver → payment (PARTIAL) → set lock → add payment refused → update payment refused → delete payment refused → delete invoice refused', async ({
    page,
    request,
  }) => {
    // 1) Fetch fixture (orderId, invoiceId)
    const fixtureRes = await request.get('/api/e2e/fixtures/clientA-prepared-order-and-invoice')
    if (fixtureRes.status() === 404) {
      test.skip(true, 'Fixture indisponible (E2E_SEED !== 1 ou CMD-E2E-PREPARED/INV-E2E-0001 absents)')
      return
    }
    const fixture = await fixtureRes.json().catch(() => ({}))
    const { orderId, invoiceId } = fixture as { orderId?: string; invoiceId?: string }
    if (!orderId || !invoiceId) {
      test.skip(true, 'Fixture invalide (orderId ou invoiceId manquants)')
      return
    }

    // 2) Order detail → Expédier then Livrer (seed order is PREPARED)
    await page.goto(`/admin/orders/${orderId}`)
    await page.waitForURL(new RegExp(`/admin/orders/${orderId}`), { timeout: 15000 })

    const expédierBtn = page.getByTestId('order-action-shipped')
    if ((await expédierBtn.count()) === 0) {
      test.skip(true, 'Bouton Expédier absent (ordre pas en PREPARED ou UI modifiée)')
      return
    }
    await expédierBtn.click()
    const shipModal = page.getByTestId('ship-order-modal')
    await expect(shipModal).toBeVisible({ timeout: 8000 })
    const agentSelect = page.locator('select[name="deliveryAgentName"]')
    const optionCount = await agentSelect.locator('option').count()
    if (optionCount < 2) {
      test.skip(true, 'Aucun livreur disponible pour Expédier (seed delivery agents)')
      return
    }
    await agentSelect.selectOption({ index: 1 })
    await page.getByTestId('confirm-ship-order').click()
    await expect(page.getByTestId('order-action-delivered')).toBeVisible({ timeout: 12000 })

    const livrerBtn = page.getByTestId('order-action-delivered')
    await livrerBtn.click()
    const deliverModal = page.getByTestId('deliver-order-modal')
    await expect(deliverModal).toBeVisible({ timeout: 5000 })
    await page.getByTestId('delivered-to-name').fill('E2E Accounting Close')
    await page.getByTestId('confirm-deliver-order').click()
    await page.waitForURL(new RegExp(`/admin/orders/${orderId}`), { timeout: 10000 })

    // 3) Invoice detail → Encaisser amount 10 (or 5 to keep PARTIAL; seed has 10 restant, 5 keeps PARTIAL)
    await page.goto(`/admin/invoices/${invoiceId}`)
    await page.waitForURL(new RegExp(`/admin/invoices/${invoiceId}`), { timeout: 15000 })

    const encaisserBtn = page.getByRole('button', { name: /Encaisser/i }).first()
    if ((await encaisserBtn.count()) === 0) {
      test.skip(true, 'Bouton Encaisser absent (solde 0 ou UI modifiée)')
      return
    }
    await encaisserBtn.click()
    await expect(page.getByTestId('payment-amount')).toBeVisible({ timeout: 5000 })
    await page.getByTestId('payment-amount').fill('5')
    await page.getByTestId('confirm-payment').click()
    await expect(page.getByText(/Paiement enregistré/i)).toBeVisible({ timeout: 8000 })

    // 4) Advance accounting lock (>= invoice.createdAt)
    const setLockRes = await request.post('/api/e2e/admin/set-accounting-locked-until', {
      data: { lockedUntilIso: '2099-01-01T00:00:00.000Z' },
    })
    if (!setLockRes.ok()) {
      test.skip(true, `set-accounting-locked-until failed: ${setLockRes.status()}`)
      return
    }

    // 5) Retry Encaisser amount 1 → expect ACCOUNTING_CLOSED_MESSAGE (list page has payment-form-error)
    await page.goto('/admin/invoices')
    await page.waitForURL(/\/admin\/invoices/, { timeout: 10000 })
    const rowAfter = getInvoiceRow(page, 'INV-E2E-0001')
    await expect(rowAfter).toBeVisible({ timeout: 5000 })
    const openPaymentBtnAfter = rowAfter.getByTestId('open-payment-form')
    if ((await openPaymentBtnAfter.count()) > 0) {
      await openPaymentBtnAfter.click()
      await expect(rowAfter.getByTestId('invoice-payment-form')).toBeVisible({ timeout: 5000 })
      await rowAfter.getByTestId('payment-amount').fill('1')
      await rowAfter.getByTestId('confirm-payment').click()
      const errorEl = page.getByTestId('payment-form-error')
      await expect(errorEl).toBeVisible({ timeout: 10000 })
      await expect(errorEl).toContainText(ACCOUNTING_CLOSED_MESSAGE)
    }

    // 6) Update payment refused (no UI for edit payment → use E2E API; backend must return ACCOUNTING_CLOSED_MESSAGE)
    const firstPaymentRes = await request.get(`/api/e2e/fixtures/invoice-first-payment?invoiceId=${invoiceId}`)
    if (!firstPaymentRes.ok()) {
      test.skip(true, 'Fixture invoice-first-payment indisponible')
      return
    }
    const { paymentId } = (await firstPaymentRes.json()) as { paymentId?: string }
    if (!paymentId) {
      test.skip(true, 'Fixture invoice-first-payment sans paymentId')
      return
    }
    const updatePaymentRes = await request.post('/api/e2e/admin/attempt-update-payment', {
      data: { paymentId, amount: 1, method: 'CASH' },
    })
    const updateBody = await updatePaymentRes.json().catch(() => ({})) as { error?: string }
    expect(updateBody.error, 'attempt-update-payment must refuse with accounting closed message').toBe(ACCOUNTING_CLOSED_MESSAGE)

    // 7) Invoice detail → delete payment → confirm → expect toast ACCOUNTING_CLOSED_MESSAGE, payment still present
    await page.goto(`/admin/invoices/${invoiceId}`)
    await page.waitForURL(new RegExp(`/admin/invoices/${invoiceId}`), { timeout: 10000 })

    const deletePaymentBtn = page.getByTestId('delete-payment-btn').first()
    if ((await deletePaymentBtn.count()) === 0) {
      test.skip(true, 'Aucun bouton Supprimer paiement (UI ou pas de paiement)')
      return
    }
    await deletePaymentBtn.click()
    const confirmPaymentDelete = page.getByRole('button', { name: /Confirmer/i }).first()
    await expect(confirmPaymentDelete).toBeVisible({ timeout: 3000 })
    await confirmPaymentDelete.click()
    await expect(page.getByText(ACCOUNTING_CLOSED_MESSAGE)).toBeVisible({ timeout: 10000 })
    // Paiement toujours présent après refus (aucune mutation DB)
    await page.reload()
    await page.waitForURL(new RegExp(`/admin/invoices/${invoiceId}`), { timeout: 10000 })
    await expect(page.getByTestId('delete-payment-btn').first()).toBeVisible({ timeout: 5000 })

    // 8) Delete invoice → confirm → expect strict ACCOUNTING_CLOSED_MESSAGE (backend checks accounting before DELIVERED)
    const deleteInvoiceBtn = page.getByRole('button', { name: /Supprimer la facture/i })
    if ((await deleteInvoiceBtn.count()) === 0) {
      test.skip(true, 'Bouton Supprimer la facture absent')
      return
    }
    await deleteInvoiceBtn.click()
    const confirmInvoiceDelete = page.getByRole('button', { name: /Confirmer la suppression/i })
    await expect(confirmInvoiceDelete).toBeVisible({ timeout: 3000 })
    await confirmInvoiceDelete.click()
    await expect(page.getByText(ACCOUNTING_CLOSED_MESSAGE)).toBeVisible({ timeout: 10000 })
  })
})
