import { test, expect } from "@playwright/test";
import { loginClient, loginAdmin } from "../helpers/auth";

test("Workflow: client crée commande -> admin prépare -> BL existe", async ({ page }) => {
  // 1) Client: aller catalogue et ajouter 1 produit au panier
  await loginClient(page);
  await page.goto("/portal");

  // Clique sur le premier bouton "Ajouter" (utilise data-testid pour plus de stabilité)
  const addBtn = page.getByTestId("add-to-cart").first();
  await expect(addBtn).toBeVisible();
  await addBtn.click();

  // Aller au panier
  await page.goto("/portal/cart");

  // Valider la commande (utilise data-testid pour plus de stabilité)
  const validateBtn = page.getByTestId("validate-order");
  await expect(validateBtn).toBeVisible();
  await validateBtn.click();

  // Attendre la redirection vers /portal/orders
  await expect(page).toHaveURL(/\/portal\/orders/);

  // Vérifier qu'une commande existe (texte contenant "CMD-" ou "commande")
  await expect(page.getByText(/CMD-|commande/i).first()).toBeVisible();

  // 2) Admin: préparer la dernière commande
  await loginAdmin(page);
  await page.goto("/admin/orders");

  // Ouvre la première commande de la liste (lien "Voir détails" ou numéro de commande)
  const firstOrderLink = page.getByRole("link", { name: /voir détails|CMD-/i }).first();
  await expect(firstOrderLink).toBeVisible();
  await firstOrderLink.click();

  // Cliquer "Préparer" (utilise data-testid pour plus de stabilité)
  const prepareBtn = page.getByTestId("order-action-prepared");
  await expect(prepareBtn).toBeVisible();
  await prepareBtn.click();

  // Attendre que la page se mette à jour après le changement de statut
  await page.waitForTimeout(1000);

  // Vérifier statut "Préparée"
  await expect(page.getByText(/Préparée|PREPARED/i)).toBeVisible();

  // Vérifier que le numéro BL existe (BL-YYYYMMDD-XXXX)
  await expect(page.getByText(/BL-\d{8}-\d{4}/i)).toBeVisible();
});
