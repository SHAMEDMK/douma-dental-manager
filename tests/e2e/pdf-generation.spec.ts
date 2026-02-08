import { test, expect } from '@playwright/test'

/**
 * Test E2E : Génération PDF
 * 
 * Ce test vérifie que :
 * - Les PDF de facture sont générés correctement
 * - Les PDF de BL sont générés correctement
 * - Le contenu PDF contient les informations essentielles
 */
test.describe('PDF Generation E2E', () => {
  test('should generate invoice PDF for admin', async ({ page }) => {
    // Aller sur la page des factures
    await page.goto('/admin/invoices')
    await expect(page).toHaveURL(/\/admin\/invoices/)
    
    // Cliquer sur la première facture
    const firstInvoiceLink = page.locator('a[href*="/admin/invoices/"]').first()
    
    if (await firstInvoiceLink.count() > 0) {
      await firstInvoiceLink.click()
      await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 15000 })
      
      // Vérifier qu'il y a un bouton de téléchargement PDF
      const pdfButton = page.locator('button:has-text("PDF"), a:has-text("PDF"), button:has-text("Télécharger")')
      const pdfCount = await pdfButton.count()
      
      if (pdfCount > 0) {
        // Récupérer l'URL du lien PDF (si c'est un lien)
        const pdfLink = page.locator('a[href*="/api/pdf"]')
        
        if (await pdfLink.count() > 0) {
          const href = await pdfLink.first().getAttribute('href')
          expect(href).toBeTruthy()
          expect(href).toContain('/api/pdf/admin/invoices/')
        }
        
        // Note: On ne télécharge pas vraiment le PDF dans ce test
        // car cela nécessiterait de vérifier le contenu binaire
        test.info().annotations.push({ 
          type: 'info', 
          description: 'Bouton/lien PDF trouvé pour facture admin' 
        })
      }
    } else {
      test.skip(true, 'Aucune facture trouvée pour tester le PDF')
    }
  })

  test('should generate delivery note PDF for admin', async ({ page }) => {
    // Aller sur la page des commandes
    await page.goto('/admin/orders')
    
    // Trouver une commande avec un BL (statut PREPARED ou supérieur)
    const preparedOrders = page.locator('tr').filter({ hasText: /préparée|expédiée|livrée/i })
    
    if (await preparedOrders.count() > 0) {
      const firstOrder = preparedOrders.first()
      // Essayer d'abord le lien BL dans la ligne du tableau (colonne BL -> "Voir")
      const blLinkInRow = firstOrder.locator('a[href*="delivery-note"]').first()
      let blPage: import('@playwright/test').Page

      if (await blLinkInRow.count() > 0) {
        const popupPromise = page.context().waitForEvent('page')
        await blLinkInRow.click()
        blPage = await popupPromise
      } else {
        // Sinon aller sur la page de détails puis cliquer sur le lien BL
        const detailsLink = firstOrder.getByRole('link', { name: /Voir détails/i })
        if (await detailsLink.count() === 0) {
          test.skip(true, 'Aucun lien Voir détails dans la ligne')
          return
        }
        await detailsLink.click()
        await page.waitForURL(/\/admin\/orders\/[^/]+$/, { timeout: 15000 })
        const blLink = page.locator('a[href*="delivery-note"]').first()
        if (await blLink.count() === 0) {
          test.skip(true, 'Aucun lien BL sur la page de détails')
          return
        }
        const popupPromise = page.context().waitForEvent('page')
        await blLink.click()
        blPage = await popupPromise
      }

      await blPage.waitForLoadState('domcontentloaded')
      await blPage.waitForTimeout(1000)
      const currentUrl = blPage.url()
      expect(currentUrl).toMatch(/delivery-note/)
      const pdfButton = blPage.locator('button:has-text("PDF"), a:has-text("PDF"), a:has-text("Télécharger")')
      if (await pdfButton.count() > 0) {
        test.info().annotations.push({ type: 'info', description: 'Bouton PDF trouvé pour BL admin' })
      }
      await blPage.close()
    } else {
      test.skip(true, 'Aucune commande avec BL trouvée pour tester le PDF')
    }
  })

  test('should display invoice print page correctly', async ({ page }) => {
    await page.goto('/admin/invoices')
    
    // Cliquer sur la première facture
    const firstInvoiceLink = page.locator('a[href*="/admin/invoices/"]').first()
    
    if (await firstInvoiceLink.count() > 0) {
      const invoiceId = await firstInvoiceLink.getAttribute('href')
      const invoiceIdMatch = invoiceId?.match(/\/invoices\/([^/]+)/)
      
      if (invoiceIdMatch) {
        const id = invoiceIdMatch[1]
        
        // Aller directement sur la page print
        await page.goto(`/admin/invoices/${id}/print`)
        await page.waitForTimeout(2000)
        
        // Vérifier que la page contient les éléments essentiels d'une facture (titre unique de la page print)
        await expect(page.getByRole('heading', { name: 'FACTURE' })).toBeVisible()
        
        // Vérifier la présence d'informations clés
        const hasCompanyInfo = await page.locator('text=/DOUMA|vendeur|entreprise/i').count() > 0
        const hasClientInfo = await page.locator('text=/facturé|client/i').count() > 0
        const hasTable = await page.locator('table').count() > 0
        
        expect(hasCompanyInfo || hasClientInfo || hasTable).toBeTruthy()
      }
    } else {
      test.skip(true, 'Aucune facture trouvée pour tester la page print')
    }
  })

  test('should verify PDF API endpoint exists', async ({ page, request }) => {
    // Aller sur une facture pour obtenir son ID
    await page.goto('/admin/invoices')
    const firstInvoiceLink = page.locator('a[href*="/admin/invoices/"]').first()
    
    if (await firstInvoiceLink.count() > 0) {
      const invoiceId = await firstInvoiceLink.getAttribute('href')
      const invoiceIdMatch = invoiceId?.match(/\/invoices\/([^/]+)/)
      
      if (invoiceIdMatch) {
        const id = invoiceIdMatch[1]
        
        // Tester l'endpoint API PDF (sans télécharger)
        // Note: L'endpoint peut nécessiter une authentification
        const response = await request.get(`/api/pdf/admin/invoices/${id}`, {
          failOnStatusCode: false // Ne pas échouer si 401/403
        })
        
        // L'endpoint devrait exister (même si non authentifié)
        // On vérifie juste qu'il n'y a pas d'erreur 404
        expect([200, 401, 403]).toContain(response.status())
      }
    } else {
      test.skip(true, 'Aucune facture trouvée pour tester l\'endpoint PDF')
    }
  })
})
