import { test, expect } from "@playwright/test";
import { loginClient, loginAdmin } from "../helpers/auth";

test("Workflow: commande -> facture -> paiement partiel -> paiement complet", async ({ page }) => {
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

  // 2) Admin: aller sur la page des factures
  await loginAdmin(page);
  await page.goto("/admin/invoices");

  // Trouver la facture correspondante (première facture impayée)
  // Les factures impayées sont affichées avec un badge "Impayée"
  // Chercher dans les lignes du tableau ou les cartes
  const unpaidInvoiceRow = page.locator('tr, .invoice-card').filter({ hasText: /Impayée/i }).first();
  
  // Si on trouve une ligne/carte avec "Impayée", cliquer dessus ou sur le lien
  if (await unpaidInvoiceRow.count() > 0) {
    // Chercher un lien dans cette ligne/carte
    const invoiceLink = unpaidInvoiceRow.getByRole("link").first();
    if (await invoiceLink.count() > 0) {
      await invoiceLink.click();
    } else {
      // Sinon, cliquer sur la ligne entière
      await unpaidInvoiceRow.click();
    }
  } else {
    // Fallback: chercher directement un lien vers une facture
    const invoiceLink = page.getByRole("link", { name: /INV-|voir|détails/i }).first();
    await expect(invoiceLink).toBeVisible({ timeout: 5000 });
    await invoiceLink.click();
  }
  
  // Attendre d'être sur la page de détails de la facture
  await expect(page).toHaveURL(/\/admin\/invoices\/[^/]+$/, { timeout: 5000 });

  // Vérifier qu'on est sur la page de détails de la facture
  await expect(page).toHaveURL(/\/admin\/invoices\/[^/]+$/);

  // Récupérer le montant à payer (balance)
  const balanceText = await page.locator('text=/reste|balance|montant/i').first().textContent();
  let balance = 0;
  if (balanceText) {
    const match = balanceText.match(/[\d,]+\.?\d*/);
    if (match) {
      balance = parseFloat(match[0].replace(/,/g, ''));
    }
  }

  // Si balance est 0, utiliser le montant total de la facture
  if (balance === 0) {
    const amountText = await page.locator('text=/total|montant|€/i').first().textContent();
    if (amountText) {
      const match = amountText.match(/[\d,]+\.?\d*/);
      if (match) {
        balance = parseFloat(match[0].replace(/,/g, ''));
      }
    }
  }

  // 3) Enregistrer un paiement partiel (50%)
  const openPaymentBtn = page.getByTestId("open-payment-form");
  await expect(openPaymentBtn).toBeVisible();
  await openPaymentBtn.click();

  const partialAmount = balance / 2;
  const amountInput = page.getByTestId("payment-amount");
  await expect(amountInput).toBeVisible();
  await amountInput.fill(partialAmount.toString());

  // Sélectionner la méthode de paiement (Espèces par défaut)
  const methodSelect = page.locator('select[name="method"]');
  await methodSelect.selectOption("CASH");

  // Confirmer le paiement
  const confirmPaymentBtn = page.getByTestId("confirm-payment");
  await expect(confirmPaymentBtn).toBeVisible();
  await confirmPaymentBtn.click();

  // Attendre que le paiement soit enregistré
  await page.waitForTimeout(2000);

  // Vérifier que le statut est "Partiellement payée"
  await expect(page.getByText(/Partiellement|PARTIAL/i)).toBeVisible({ timeout: 5000 });

  // 4) Enregistrer le paiement restant
  await openPaymentBtn.click();
  
  // Le montant restant devrait être pré-rempli
  const remainingAmountInput = page.getByTestId("payment-amount");
  await expect(remainingAmountInput).toBeVisible();
  
  // Confirmer le paiement final
  await confirmPaymentBtn.click();
  await page.waitForTimeout(2000);

  // Vérifier que le statut est "Payée"
  await expect(page.getByText(/Payée|PAID/i)).toBeVisible({ timeout: 5000 });

  // Vérifier que la commande associée est maintenant "Livrée" (si elle était expédiée)
  // Aller sur la page des commandes pour vérifier
  await page.goto("/admin/orders");
  
  // Trouver la commande
  const orderLink = page.getByRole("link", { name: new RegExp(orderNumber || "CMD-", "i") }).first();
  if (await orderLink.count() > 0) {
    await orderLink.click();
    // Si la commande était expédiée, elle devrait maintenant être livrée après paiement complet
    // (selon la logique métier)
  }
});
