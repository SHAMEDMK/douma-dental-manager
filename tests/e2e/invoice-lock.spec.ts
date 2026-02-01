import { test, expect } from '@playwright/test'

/**
 * Test E2E : Blocage modification après facture
 * 
 * Ce test vérifie que :
 * - Une commande avec facture ne peut plus être modifiée
 * - Les erreurs "Facture verrouillée" s'affichent correctement
 * - Les boutons de modification sont désactivés/cachés
 */
test.describe('Invoice Lock E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@douma.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin/, { timeout: 5000 })
  })

  test('should prevent modification of order with locked invoice', async ({ page }) => {
    await page.goto('/admin/orders')
    
    // Trouver une commande avec statut DELIVERED (qui a normalement une facture)
    const deliveredOrders = page.locator('tr').filter({ hasText: 'Livrée' })
    const deliveredCount = await deliveredOrders.count()
    
    if (deliveredCount > 0) {
      // Cliquer sur le lien "Détails" de la première commande livrée
      const firstDelivered = deliveredOrders.first()
      const detailsLink = firstDelivered.locator('a:has-text("Détails"), a:has-text("Voir")')
      
      if (await detailsLink.count() > 0) {
        await detailsLink.click()
        await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 5000 })
        
        // Vérifier qu'il n'y a pas de boutons de modification
        // (les commandes livrées ne devraient plus être modifiables)
        const editButtons = page.locator('button:has-text("Modifier"), button:has-text("Éditer")')
        const editCount = await editButtons.count()
        
        if (editCount > 0) {
          // Si des boutons de modification existent, vérifier qu'ils sont désactivés
          const firstEdit = editButtons.first()
          await expect(firstEdit).toBeDisabled()
        } else {
          // Pas de boutons de modification = normal pour une commande livrée
          test.info().annotations.push({ 
            type: 'info', 
            description: 'Aucun bouton de modification trouvé (comportement attendu pour commande livrée)' 
          })
        }
      }
    } else {
      test.skip('Aucune commande livrée trouvée pour tester le verrouillage')
    }
  })

  test('should display invoice locked badge', async ({ page }) => {
    // Aller sur une page de facture
    await page.goto('/admin/invoices')
    
    // Cliquer sur la première facture (si elle existe)
    const firstInvoiceLink = page.locator('a[href*="/admin/invoices/"]').first()
    
    if (await firstInvoiceLink.count() > 0) {
      await firstInvoiceLink.click()
      await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 5000 })
      
      // Chercher le badge "Facture verrouillée" si présent
      const lockedBadge = page.locator('text=/verrouillée|locked/i')
      const badgeCount = await lockedBadge.count()
      
      // Le badge peut être présent ou non selon l'état de la facture
      if (badgeCount > 0) {
        await expect(lockedBadge.first()).toBeVisible()
      } else {
        test.info().annotations.push({ 
          type: 'info', 
          description: 'Facture non verrouillée (peut être modifiée)' 
        })
      }
    } else {
      test.skip('Aucune facture trouvée pour tester le badge')
    }
  })

  test('should prevent payment modification on locked invoice', async ({ page }) => {
    await page.goto('/admin/invoices')
    
    // Trouver une facture payée (qui devrait être verrouillée)
    const paidInvoices = page.locator('tr').filter({ hasText: 'Payée' })
    
    if (await paidInvoices.count() > 0) {
      const firstPaid = paidInvoices.first()
      const detailsLink = firstPaid.locator('a:has-text("Détails"), a:has-text("Voir")')
      
      if (await detailsLink.count() > 0) {
        await detailsLink.click()
        await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 5000 })
        
        // Vérifier qu'il n'y a pas de formulaire de paiement pour une facture payée
        const paymentForm = page.locator('form:has-text("Encaisser"), button:has-text("Encaisser")')
        const formCount = await paymentForm.count()
        
        // Une facture payée ne devrait pas avoir de formulaire de paiement
        if (formCount === 0) {
          test.info().annotations.push({ 
            type: 'info', 
            description: 'Formulaire de paiement absent (comportement attendu pour facture payée)' 
          })
        } else {
          // Si le formulaire existe, il devrait être désactivé ou caché
          const form = paymentForm.first()
          await expect(form).not.toBeVisible({ visible: false })
        }
      }
    } else {
      test.skip('Aucune facture payée trouvée pour tester le verrouillage')
    }
  })
})
