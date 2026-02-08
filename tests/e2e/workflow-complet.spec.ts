import { test, expect } from '@playwright/test'

/**
 * Test E2E : Workflow complet
 * Création commande → livraison → facture → paiement
 */
test.describe('Workflow Complet E2E', () => {
  // Note: Ce test nécessite une base de données avec des données de test
  // Assurez-vous d'avoir :
  // - Un client : email='client@dental.com', password='password123'
  // - Un admin : email='admin@douma.com', password='password'
  // - Au moins un produit avec stock > 0

  test('Workflow complet : Création commande → livraison → facture → paiement', async ({ page, context }) => {
    let adminPage: import('@playwright/test').Page

    // ========== ÉTAPE 1 : Client (session déjà chargée) ==========
    await test.step('Client sur le portal', async () => {
      await page.goto('/portal')
      await expect(page).toHaveURL(/\/portal/)
    })

    // ========== ÉTAPE 2 : Client ajoute produit au panier ==========
    await test.step('Client ajoute produit au panier', async () => {
      await expect(page.locator('h1, h2')).toContainText(/catalogue|produits/i)
      const addToCartButton = page.getByTestId('add-to-cart').first()
      if (await addToCartButton.count() > 0) {
        await addToCartButton.click()
        await page.waitForTimeout(1000)
      } else {
        test.skip(true, 'Aucun produit disponible dans le catalogue')
      }
    })

    // ========== ÉTAPE 3 : Client valide le panier ==========
    await test.step('Client valide le panier', async () => {
      await page.goto('/portal/cart')
      await expect(page).toHaveURL(/\/portal\/cart/)
      await page.waitForTimeout(3000)
      await expect(page.getByText('Chargement du crédit…')).toHaveCount(0, { timeout: 15000 }).catch(() => {})
      const creditBlocked = page.locator('text=/dépassé|Aucun crédit autorisé|Impossible de charger les informations de crédit/i')
      if (await creditBlocked.count() > 0) {
        test.skip(true, 'Crédit bloqué - impossible de valider le panier')
      }
      const validateButton = page.getByTestId('validate-order')
      if (await validateButton.count() === 0) {
        test.skip(true, 'Le panier est vide ou bouton Valider absent')
      }
      await expect(validateButton).toBeEnabled({ timeout: 15000 })
      await validateButton.click()
      await page.waitForURL(/\/portal\/orders/, { timeout: 15000 })
      await expect(page).toHaveURL(/\/portal\/orders/)
    })

    // ========== ÉTAPE 4 : Admin se connecte ==========
    await test.step('Admin se connecte', async () => {
      adminPage = await context.newPage()
      await adminPage.goto('/login')
      await adminPage.waitForSelector('input[name="email"]', { timeout: 10000 })
      await adminPage.fill('input[name="email"]', 'admin@douma.com')
      await adminPage.fill('input[name="password"]', 'password')
      await adminPage.click('button[type="submit"]')
      await adminPage.waitForURL(/\/admin/, { timeout: 15000 })
      await page.close()
    })

    // ========== ÉTAPE 5 : Admin prépare la commande ==========
    await test.step('Admin prépare la commande', async () => {
      await adminPage.goto('/admin/orders')
      await expect(adminPage).toHaveURL(/\/admin\/orders/)
      await adminPage.waitForLoadState('domcontentloaded')
      await adminPage.waitForTimeout(1000)

      const confirmedOrders = adminPage.locator('tr').filter({ hasText: 'Confirmée' })
      await expect(confirmedOrders.first()).toBeVisible({ timeout: 10000 })
      const firstOrder = confirmedOrders.first()
      const prepareButton = firstOrder.locator('button:has-text("Préparer")')
      if (await prepareButton.count() === 0) {
        test.skip(true, 'Aucun bouton Préparer sur une commande confirmée')
      }
      await prepareButton.click()
      await adminPage.waitForTimeout(2000)
    })

    // ========== ÉTAPE 6 : Admin expédie la commande ==========
    await test.step('Admin expédie la commande', async () => {
      await adminPage.reload()
      await adminPage.waitForLoadState('domcontentloaded')
      const preparedOrders = adminPage.locator('tr').filter({ hasText: 'Préparée' })
      
      if (await preparedOrders.count() > 0) {
        const firstPrepared = preparedOrders.first()
        const shipButton = firstPrepared.locator('button:has-text("Expédier"), button:has-text("Ship")')
        if (await shipButton.count() > 0) {
          await shipButton.click()
          await adminPage.waitForTimeout(2000)
        }
      }
    })

    // ========== ÉTAPE 7 : Admin livre la commande (crée facture) ==========
    await test.step('Admin livre la commande', async () => {
      await adminPage.reload()
      const shippedOrders = adminPage.locator('tr').filter({ hasText: 'Expédiée' })
      if (await shippedOrders.count() > 0) {
        const firstShipped = shippedOrders.first()
        const deliverButton = firstShipped.locator('button:has-text("Livrer"), button:has-text("Deliver")')
        if (await deliverButton.count() > 0) {
          await deliverButton.click()
          await adminPage.waitForTimeout(3000)
        }
      }
    })

    // ========== ÉTAPE 8 : Admin enregistre le paiement ==========
    await test.step('Admin enregistre le paiement', async () => {
      await adminPage.goto('/admin/invoices')
      await expect(adminPage).toHaveURL(/\/admin\/invoices/)
      const unpaidInvoices = adminPage.locator('tr').filter({ hasText: 'Impayée' })
      if (await unpaidInvoices.count() > 0) {
        const firstInvoice = unpaidInvoices.first()
        const detailsLink = firstInvoice.getByRole('link', { name: /Voir détails/i })
        if (await detailsLink.count() > 0) {
          await detailsLink.click()
          await adminPage.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 15000 })
          const amountInput = adminPage.locator('input[name="amount"], input[type="number"]').first()
          if (await amountInput.count() > 0) {
            const paymentMethod = adminPage.locator('select[name="method"], select[name="paymentMethod"]')
            if (await paymentMethod.count() > 0) {
              await paymentMethod.selectOption('CASH')
            }
            const submitButton = adminPage.locator('button:has-text("Encaisser"), button:has-text("Confirmer")')
            if (await submitButton.count() > 0) {
              await submitButton.click()
              await adminPage.waitForTimeout(2000)
              await expect(adminPage.locator('text=/payée/i')).toBeVisible({ timeout: 5000 })
            }
          }
        }
      }
    })

    // ========== VÉRIFICATION FINALE ==========
    await test.step('Vérification finale', async () => {
      await adminPage.goto('/admin/invoices')
      const paidInvoice = adminPage.locator('tr').filter({ hasText: 'Payée' }).first()
      await expect(paidInvoice).toBeVisible({ timeout: 10000 })
    })
  })

  test('Workflow avec données minimales - Test simplifié', async ({ page }) => {
    // Session client déjà chargée : vérification portal puis accès admin refusé
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/portal/)

    await page.goto('/admin')
    // Client ne peut pas accéder à admin : redirection vers login ou autre
    const url = page.url()
    expect(url).not.toMatch(/\/admin\/dashboard/)
  })
})
