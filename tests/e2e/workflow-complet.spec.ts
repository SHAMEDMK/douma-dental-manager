import { test, expect } from '@playwright/test'

/**
 * Test E2E : Workflow complet
 * Création commande → livraison → facture → paiement
 */
test.describe('Workflow Complet E2E', () => {
  // Note: Ce test nécessite une base de données avec des données de test
  // Assurez-vous d'avoir :
  // - Un client : email='client@test.com', password='password123'
  // - Un admin : email='admin@douma.com', password='password'
  // - Au moins un produit avec stock > 0

  test('Workflow complet : Création commande → livraison → facture → paiement', async ({ page, context }) => {
    // ========== ÉTAPE 1 : Client se connecte ==========
    await test.step('Client se connecte', async () => {
      await page.goto('/login')
      await page.fill('input[name="email"]', 'client@test.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      // Attendre la redirection vers /portal
      await page.waitForURL(/\/portal/, { timeout: 5000 })
      await expect(page).toHaveURL(/\/portal/)
    })

    // ========== ÉTAPE 2 : Client ajoute produit au panier ==========
    await test.step('Client ajoute produit au panier', async () => {
      // Vérifier qu'on est sur le catalogue
      await expect(page.locator('h1, h2')).toContainText(/catalogue|produits/i)
      
      // Chercher le premier produit avec un bouton "Ajouter"
      const addToCartButton = page.locator('button:has-text("Ajouter"), button:has-text("+")').first()
      
      if (await addToCartButton.count() > 0) {
        await addToCartButton.click()
        // Attendre un peu pour que l'ajout se fasse
        await page.waitForTimeout(1000)
      } else {
        test.skip('Aucun produit disponible dans le catalogue')
      }
    })

    // ========== ÉTAPE 3 : Client valide le panier ==========
    await test.step('Client valide le panier', async () => {
      // Aller au panier
      await page.goto('/portal/cart')
      await expect(page).toHaveURL(/\/portal\/cart/)
      
      // Vérifier qu'il y a au moins un article dans le panier
      const cartItems = page.locator('tbody tr, .cart-item')
      const itemCount = await cartItems.count()
      
      if (itemCount === 0) {
        test.skip('Le panier est vide')
      }
      
      // Cliquer sur "Valider le panier" ou "Commander"
      const validateButton = page.locator('button:has-text("Valider"), button:has-text("Commander"), button:has-text("Passer la commande")').first()
      await validateButton.click()
      
      // Attendre la redirection vers /portal/orders
      await page.waitForURL(/\/portal\/orders/, { timeout: 5000 })
      await expect(page).toHaveURL(/\/portal\/orders/)
    })

    // ========== ÉTAPE 4 : Admin se connecte (nouveau contexte) ==========
    await test.step('Admin se connecte', async () => {
      // Créer une nouvelle page pour l'admin (ou se déconnecter/reconnecter)
      const adminPage = await context.newPage()
      
      await adminPage.goto('/login')
      await adminPage.fill('input[name="email"]', 'admin@douma.com')
      await adminPage.fill('input[name="password"]', 'password')
      await adminPage.click('button[type="submit"]')
      
      await adminPage.waitForURL(/\/admin/, { timeout: 5000 })
      await expect(adminPage).toHaveURL(/\/admin/)
      
      // Utiliser adminPage pour la suite
      await page.close()
      // Note: Dans un vrai test, vous devriez gérer deux sessions simultanées
      // Pour simplifier, on utilise une seule page
    })

    // ========== ÉTAPE 5 : Admin prépare la commande ==========
    await test.step('Admin prépare la commande', async () => {
      const adminPage = await context.newPage()
      
      await adminPage.goto('/admin/orders')
      await expect(adminPage).toHaveURL(/\/admin\/orders/)
      
      // Trouver la première commande avec statut CONFIRMED
      // Sélecteur possible : table tr avec badge "Confirmée"
      const confirmedOrders = adminPage.locator('tr').filter({ hasText: 'Confirmée' })
      const orderCount = await confirmedOrders.count()
      
      if (orderCount === 0) {
        test.skip('Aucune commande confirmée trouvée')
      }
      
      // Cliquer sur le bouton "Préparer" de la première commande
      const firstOrder = confirmedOrders.first()
      const prepareButton = firstOrder.locator('button:has-text("Préparer")')
      
      if (await prepareButton.count() > 0) {
        await prepareButton.click()
        // Attendre le message de succès
        await adminPage.waitForTimeout(2000)
        // Vérifier que le statut a changé (optionnel, dépend de l'UI)
      }
    })

    // ========== ÉTAPE 6 : Admin expédie la commande ==========
    await test.step('Admin expédie la commande', async () => {
      // Recharger la page pour voir le nouveau statut
      await page.reload()
      
      // Trouver la commande avec statut PREPARED
      const preparedOrders = page.locator('tr').filter({ hasText: 'Préparée' })
      
      if (await preparedOrders.count() > 0) {
        const firstPrepared = preparedOrders.first()
        const shipButton = firstPrepared.locator('button:has-text("Expédier"), button:has-text("Ship")')
        
        if (await shipButton.count() > 0) {
          await shipButton.click()
          await page.waitForTimeout(2000)
        }
      }
    })

    // ========== ÉTAPE 7 : Admin livre la commande (crée facture) ==========
    await test.step('Admin livre la commande', async () => {
      await page.reload()
      
      // Trouver la commande avec statut SHIPPED
      const shippedOrders = page.locator('tr').filter({ hasText: 'Expédiée' })
      
      if (await shippedOrders.count() > 0) {
        const firstShipped = shippedOrders.first()
        const deliverButton = firstShipped.locator('button:has-text("Livrer"), button:has-text("Deliver")')
        
        if (await deliverButton.count() > 0) {
          await deliverButton.click()
          // Attendre que la facture soit créée
          await page.waitForTimeout(3000)
        }
      }
    })

    // ========== ÉTAPE 8 : Admin enregistre le paiement ==========
    await test.step('Admin enregistre le paiement', async () => {
      // Aller sur la page des factures
      await page.goto('/admin/invoices')
      await expect(page).toHaveURL(/\/admin\/invoices/)
      
      // Trouver la première facture impayée
      const unpaidInvoices = page.locator('tr').filter({ hasText: 'Impayée' })
      
      if (await unpaidInvoices.count() > 0) {
        // Cliquer sur "Voir détails" ou le lien vers la facture
        const firstInvoice = unpaidInvoices.first()
        const detailsLink = firstInvoice.locator('a:has-text("Détails"), a:has-text("Voir")')
        
        if (await detailsLink.count() > 0) {
          await detailsLink.click()
          await page.waitForURL(/\/admin\/invoices\/[^/]+$/, { timeout: 5000 })
          
          // Remplir le formulaire de paiement
          const amountInput = page.locator('input[name="amount"], input[type="number"]').first()
          if (await amountInput.count() > 0) {
            // Récupérer le montant à payer (peut être dans un élément texte)
            const balanceText = await page.locator('text=/reste|balance/i').first().textContent()
            // Ou utiliser le montant par défaut dans l'input
            await amountInput.fill('') // Vider pour utiliser la valeur par défaut
            
            // Sélectionner la méthode de paiement
            const paymentMethod = page.locator('select[name="method"], select[name="paymentMethod"]')
            if (await paymentMethod.count() > 0) {
              await paymentMethod.selectOption('CASH')
            }
            
            // Cliquer sur "Encaisser" ou "Confirmer"
            const submitButton = page.locator('button:has-text("Encaisser"), button:has-text("Confirmer")')
            if (await submitButton.count() > 0) {
              await submitButton.click()
              await page.waitForTimeout(2000)
              
              // Vérifier que la facture est maintenant "Payée"
              await expect(page.locator('text=/payée/i')).toBeVisible({ timeout: 5000 })
            }
          }
        }
      }
    })

    // ========== VÉRIFICATION FINALE ==========
    await test.step('Vérification finale', async () => {
      // Vérifier que la facture est bien payée
      await page.goto('/admin/invoices')
      const paidInvoice = page.locator('tr').filter({ hasText: 'Payée' }).first()
      await expect(paidInvoice).toBeVisible()
    })
  })

  test('Workflow avec données minimales - Test simplifié', async ({ page }) => {
    // Version simplifiée qui vérifie juste que les pages se chargent
    // Utile si vous n'avez pas de données de test
    
    await page.goto('/login')
    await expect(page.locator('h1')).toContainText(/douma|dental/i)
    
    // Tester la navigation
    await page.goto('/portal')
    await expect(page).toHaveURL(/\/portal/)
    
    await page.goto('/admin')
    // Devrait rediriger vers /login si pas connecté
    // ou afficher le dashboard si connecté
  })
})
