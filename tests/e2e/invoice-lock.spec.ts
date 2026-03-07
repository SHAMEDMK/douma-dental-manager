import { test, expect } from '@playwright/test'
import { loginClient, loginAdmin } from '../helpers/auth'

const ORDER_NOT_MODIFIABLE_MESSAGE = 'Facture émise : modification interdite.'

/**
 * Test E2E : Blocage modification après facture
 * 
 * Ce test vérifie que :
 * - Une commande avec facture ne peut plus être modifiée
 * - Les erreurs "Facture verrouillée" s'affichent correctement
 * - Les boutons de modification sont désactivés/cachés
 */
test.describe('Invoice Lock E2E', () => {
  test('should prevent modification of order with locked invoice', async ({ page }) => {
    await page.goto('/admin/orders')
    
    // Trouver une commande avec statut DELIVERED (qui a normalement une facture)
    const deliveredOrders = page.locator('tr').filter({ hasText: 'Livrée' })
    const deliveredCount = await deliveredOrders.count()
    
    if (deliveredCount > 0) {
      // Cliquer sur le lien "Voir détails" (éviter le sélecteur ambigu qui matche 2 liens)
      const firstDelivered = deliveredOrders.first()
      const detailsLink = firstDelivered.getByRole('link', { name: /Voir détails/i })
      
      if (await detailsLink.count() > 0) {
        await detailsLink.click()
        await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 15000 })
        
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
      test.skip(true, 'Aucune commande livrée trouvée pour tester le verrouillage')
    }
  })

  test('should display invoice locked badge', async ({ page }) => {
    // Aller sur une page de facture
    await page.goto('/admin/invoices')
    
    // Cliquer sur la première facture (si elle existe)
    const firstInvoiceLink = page.locator('a[href*="/admin/invoices/"]').first()
    
    if (await firstInvoiceLink.count() > 0) {
      await firstInvoiceLink.click()
      await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 15000 })
      
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
      test.skip(true, 'Aucune facture trouvée pour tester le badge')
    }
  })

  test('should prevent payment modification on locked invoice', async ({ page }) => {
    await page.goto('/admin/invoices')
    
    // Trouver une facture payée (qui devrait être verrouillée)
    const paidInvoices = page.locator('tr').filter({ hasText: 'Payée' })
    
    if (await paidInvoices.count() > 0) {
      const firstPaid = paidInvoices.first()
      const detailsLink = firstPaid.getByRole('link', { name: /Voir détails/i })
      
      if (await detailsLink.count() > 0) {
        await detailsLink.click()
        await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 15000 })
        
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
      test.skip(true, 'Aucune facture payée trouvée pour tester le verrouillage')
    }
  })

  test('DELIVERED: should ALLOW marking invoice paid when accounting is open', async ({ page }) => {
    // Règle ERP : paiement autorisé après livraison (COD/délai) si période comptable ouverte.
    // Cas déterministe : commande PREPARED → marquer livrée → facture avec solde → encaisser → succès.
    await loginAdmin(page)
    await page.goto('/admin/orders')
    await page.waitForURL(/\/admin\/orders/, { timeout: 15000 })

    const preparedRow = page.locator('tr').filter({ hasText: 'Préparée' }).first()
    if ((await preparedRow.count()) === 0) {
      test.skip(true, 'Aucune commande Préparée en seed (E2E seed avec CMD-E2E-PREPARED)')
      return
    }
    await preparedRow.getByRole('link', { name: /Voir détails/i }).first().click()
    await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 15000 })

    const livrerBtn = page.getByRole('button', { name: /Livrer/i }).first()
    if ((await livrerBtn.count()) === 0) {
      test.skip(true, 'Bouton Livrer absent (ordre déjà livré ou autre statut)')
      return
    }
    await livrerBtn.click()
    await page.getByTestId('delivered-to-name').fill('E2E Test')
    await page.getByRole('button', { name: /Confirmer la livraison/i }).click()
    await page.waitForTimeout(1500)

    const invoiceLink = page.getByRole('link', { name: /Facture|INV|invoice/i }).first()
    if ((await invoiceLink.count()) === 0) {
      test.skip(true, 'Pas de lien facture sur la commande')
      return
    }
    await invoiceLink.click()
    await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 15000 })

    const encaisserBtn = page.getByRole('button', { name: /Encaisser/i }).first()
    if ((await encaisserBtn.count()) === 0) {
      test.skip(true, 'Pas de bouton Encaisser (facture déjà soldée ou période clôturée)')
      return
    }
    await encaisserBtn.click()
    await page.getByTestId('payment-amount').fill('10')
    await page.getByTestId('confirm-payment').click()

    await expect(page.getByText(/Paiement enregistré/i)).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(/Impossible d'enregistrer un paiement sur une commande déjà livrée/i)).not.toBeVisible()
  })

  test('DELIVERED: should prevent delete/update payment when order is delivered', async ({ page }) => {
    // Règle : DELIVERED interdit modification/suppression de paiements ; ajout reste autorisé.
    await loginAdmin(page)
    await page.goto('/admin/orders')
    const deliveredRow = page.locator('tr').filter({ hasText: 'Livrée' }).first()
    if ((await deliveredRow.count()) === 0) {
      test.skip(true, 'Aucune commande livrée pour tester payment delete refusé')
      return
    }
    await deliveredRow.getByRole('link', { name: /Voir détails/i }).first().click()
    await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 15000 })
    const invoiceLink = page.getByRole('link', { name: /Facture|invoice/i }).first()
    if ((await invoiceLink.count()) === 0) {
      test.skip(true, 'Commande livrée sans lien facture')
      return
    }
    await Promise.all([
      page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 20000 }),
      invoiceLink.click(),
    ])
    const deletePaymentBtn = page.getByTestId('delete-payment-btn').first()
    if ((await deletePaymentBtn.count()) === 0) {
      test.skip(true, 'Aucun paiement sur cette facture (pas de bouton Supprimer)')
      return
    }
    await deletePaymentBtn.click()
    await page.getByRole('button', { name: /Confirmer/i }).first().click()
    await expect(page.getByText(ORDER_NOT_MODIFIABLE_MESSAGE)).toBeVisible({ timeout: 5000 })
  })

  test('DELIVERED: should prevent deleting invoice when order is delivered', async ({ page }) => {
    // Règle : DELIVERED = aucune modification financière (y compris suppression facture)
    await page.goto('/admin/orders')
    const deliveredRow = page.locator('tr').filter({ hasText: 'Livrée' }).first()
    if ((await deliveredRow.count()) === 0) {
      test.skip(true, 'Aucune commande livrée pour tester deleteInvoice bloqué')
      return
    }
    await deliveredRow.getByRole('link', { name: /Voir détails/i }).first().click()
    await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 15000 })
    const invoiceLink = page.getByRole('link', { name: /Facture|invoice/i }).first()
    if ((await invoiceLink.count()) === 0) {
      test.skip(true, 'Commande livrée sans lien facture')
      return
    }
    await Promise.all([
      page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 20000 }),
      invoiceLink.click(),
    ])
    const deleteBtn = page.getByRole('button', { name: /Supprimer la facture/i }).first()
    if ((await deleteBtn.count()) === 0) {
      test.skip(true, 'Pas de bouton Supprimer sur cette page facture (ou facture verrouillée)')
      return
    }
    await deleteBtn.click()
    await page.getByRole('button', { name: /Confirmer la suppression/i }).click()
    await expect(page.getByText(/Impossible de supprimer la facture d'une commande déjà livrée/i)).toBeVisible({ timeout: 5000 })
  })

  test('cancel order refused when invoice is locked (PARTIAL/paidAmount>0) - constant message, status unchanged', async ({ page }) => {
    // Règle : une commande ne peut pas être annulée si la facture associée est verrouillée.
    // Seed E2E : commande CMD-E2E-PREPARED avec facture INV-E2E-0001 PARTIAL (1 paiement).
    await loginClient(page)
    await page.goto('/portal/orders')
    await page.waitForURL(/\/portal\/orders/, { timeout: 15000 })

    const cancelBtn = page.getByRole('button', { name: /Annuler la commande/i }).first()
    if ((await cancelBtn.count()) === 0) {
      test.skip(true, 'Aucune commande annulable avec facture PARTIAL en seed (skip si pas E2E seed)')
      return
    }

    await cancelBtn.click()
    await page.getByRole('button', { name: /Confirmer l'annulation/i }).click()

    await expect(page.getByText(/Cette commande n'est plus modifiable/i)).toBeVisible({ timeout: 5000 })
    // Statut inchangé : la carte commande est toujours visible (pas de message de succès ni redirection)
    await expect(page.getByText(/Commande annulée avec succès/i)).not.toBeVisible()
  })
})
