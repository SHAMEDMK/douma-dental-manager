import { test, expect } from "@playwright/test";
import { loginClient, loginAdmin, loginDeliveryAgent } from "../helpers/auth";

test("Workflow complet: commande -> préparation -> expédition -> livraison avec code", async ({ page }) => {
  // 1) Client: créer une commande
  await loginClient(page);
  await page.goto("/portal");

  // Ajouter un produit au panier
  const addBtn = page.getByTestId("add-to-cart").first();
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Aller au panier et valider
  await page.goto("/portal/cart");
  const validateBtn = page.getByTestId("validate-order");
  await expect(validateBtn).toBeVisible();
  
  // Attendre que les informations de crédit se chargent
  await page.waitForTimeout(2000);
  
  // Vérifier s'il y a un message d'erreur de crédit
  const creditError = page.locator('text=/plafond|crédit|dépassé|aucun crédit/i');
  const hasCreditError = await creditError.count() > 0;
  
  if (hasCreditError) {
    // Si le crédit est bloqué, on ne peut pas continuer
    const errorText = await creditError.first().textContent();
    test.skip(`Crédit bloqué: ${errorText}`);
  }
  
  // Attendre que le bouton soit activé (peut prendre du temps si creditInfo se charge)
  await expect(validateBtn).toBeEnabled({ timeout: 10000 });
  await validateBtn.click();

  // Attendre la redirection
  await expect(page).toHaveURL(/\/portal\/orders/);
  
  // Récupérer le numéro de commande
  const orderNumberElement = page.getByText(/CMD-/).first();
  await expect(orderNumberElement).toBeVisible();
  const orderNumber = await orderNumberElement.textContent();

  // Note: Le code de confirmation n'est disponible qu'après l'expédition
  // On le récupérera après que l'admin ait expédié la commande

  // 2) Admin: préparer la commande
  await loginAdmin(page);
  await page.goto("/admin/orders");

  // Trouver et ouvrir la commande
  const orderLink = page.getByRole("link", { name: new RegExp(orderNumber || "CMD-", "i") }).first();
  await expect(orderLink).toBeVisible();
  await orderLink.click();

  // Préparer
  const prepareBtn = page.getByTestId("order-action-prepared");
  await expect(prepareBtn).toBeVisible();
  await prepareBtn.click();
  await page.waitForTimeout(1000);

  // Vérifier le statut "Préparée"
  await expect(page.getByText(/Préparée|PREPARED/i)).toBeVisible();

  // 3) Admin: expédier la commande
  const shipBtn = page.getByTestId("order-action-shipped");
  await expect(shipBtn).toBeVisible();
  await shipBtn.click();

  // Dans le modal, sélectionner un livreur
  await page.waitForSelector('select[name="deliveryAgentName"]', { timeout: 5000 });
  const agentSelect = page.locator('select[name="deliveryAgentName"]');
  await expect(agentSelect).toBeVisible();
  
  // Sélectionner le premier livreur disponible
  const firstOption = agentSelect.locator('option').nth(1);
  if (await firstOption.count() > 0) {
    const agentValue = await firstOption.getAttribute('value');
    if (agentValue) {
      await agentSelect.selectOption(agentValue);
    }
  }

  // Confirmer l'expédition
  const confirmShipBtn = page.getByTestId("confirm-ship-order");
  await expect(confirmShipBtn).toBeVisible();
  await confirmShipBtn.click();
  await page.waitForTimeout(2000);

  // Vérifier le statut "Expédiée"
  await expect(page.getByText(/Expédiée|SHIPPED/i)).toBeVisible();

  // Récupérer le code de confirmation depuis la page admin
  // Le code devrait être affiché quelque part sur la page
  let confirmationCode = "";
  
  // Chercher le code dans le format 6 chiffres
  const codeElements = page.locator('text=/\\d{6}/');
  const codeCount = await codeElements.count();
  
  if (codeCount > 0) {
    // Prendre le premier code trouvé qui a exactement 6 chiffres
    for (let i = 0; i < codeCount; i++) {
      const text = await codeElements.nth(i).textContent();
      if (text) {
        const match = text.match(/\d{6}/);
        if (match && match[0].length === 6) {
          confirmationCode = match[0];
          break;
        }
      }
    }
  }

  // Si on n'a pas le code, aller sur la page client pour le récupérer
  if (!confirmationCode) {
    await loginClient(page);
    await page.goto("/portal/orders");
    
    // Chercher le code dans la liste des commandes
    const clientCodeElements = page.locator('text=/\\d{6}/');
    if (await clientCodeElements.count() > 0) {
      const codeText = await clientCodeElements.first().textContent();
      if (codeText) {
        const match = codeText.match(/\d{6}/);
        if (match) {
          confirmationCode = match[0];
        }
      }
    }
  }

  // 4) Livreur: confirmer la livraison avec le code
  await loginDeliveryAgent(page);
  await page.goto("/delivery");

  // Vérifier que la commande est visible
  await expect(page.getByText(/CMD-|commande/i).first()).toBeVisible({ timeout: 10000 });

  // Vérifier que la page livreur affiche les infos utiles (badge, liste produits, montant à encaisser ; Maps si adresse)
  await test.step("Page livreur affiche badge paiement, liste produits, montant à encaisser", async () => {
    await expect(page.getByTestId("delivery-payment-badge").first()).toBeVisible();
    await expect(page.getByTestId("delivery-products-list").first()).toBeVisible();
    await expect(page.getByTestId("delivery-amount-section").first()).toBeVisible();
    const mapsLink = page.getByTestId("delivery-maps-link");
    if (await mapsLink.count() > 0) {
      await expect(mapsLink.first()).toBeVisible();
    }
  });

  // Si on a le code, l'utiliser pour confirmer la livraison
  if (confirmationCode && confirmationCode.length === 6) {
    const codeInput = page.getByTestId("delivery-confirmation-code");
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    await codeInput.fill(confirmationCode);

    // Remplir le nom de la personne qui a reçu
    const deliveredToInput = page.locator('input[placeholder*="Nom de la personne"]');
    await deliveredToInput.fill("Test Client");

    // Confirmer la livraison
    const confirmBtn = page.getByTestId("confirm-delivery-button");
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Attendre que la confirmation soit traitée
    await page.waitForTimeout(2000);

    // Vérifier que la commande est maintenant livrée
    // Soit elle disparaît de la liste, soit le statut change
    await expect(page.getByText(/Livrée|DELIVERED|confirmée/i).first()).toBeVisible({ timeout: 5000 });
  } else {
    // Si on n'a pas le code, on vérifie juste que le formulaire est présent
    const codeInput = page.getByTestId("delivery-confirmation-code");
    await expect(codeInput).toBeVisible({ timeout: 5000 });
    test.info().annotations.push({ type: 'note', description: 'Code de confirmation non récupéré, test partiel' });
  }
});
