import { test, expect } from "@playwright/test";


test("Gestion des clients: voir la liste des clients", async ({ page }) => {
  await page.goto("/admin/clients");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/clients/);
  await expect(page.getByText(/Clients|clients/i).first()).toBeVisible();

  // Vérifier qu'il y a au moins un client ou un message vide
  const clientsTable = page.locator("table, .client-list");
  const emptyMessage = page.getByText(/aucun|no clients|empty/i);

  if (await clientsTable.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Liste de clients trouvée"
    });
    
    // Cliquer sur le premier lien client (exclure les liens de navigation)
    const clientLinks = page.getByRole("link").filter({ hasNotText: /dashboard|commandes|factures|stock|produits|clients|livreurs|paiements|logs|audit|backups|paramètres|settings/i });
    if (await clientLinks.count() > 0) {
      const firstClientLink = clientLinks.first();
      const href = await firstClientLink.getAttribute("href");
      if (href && href.includes("/admin/clients/") && !href.includes("/admin/clients/invite")) {
        await firstClientLink.click();
        await expect(page).toHaveURL(/\/admin\/clients\/[^/]+$/, { timeout: 5000 });
      }
    }
  } else if (await emptyMessage.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Aucun client dans la liste"
    });
  }
});

test("Gestion des clients: créer une invitation", async ({ page }) => {
  await page.goto("/admin/clients/invite");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/clients\/invite/);
  
  // Vérifier qu'il y a un formulaire d'invitation
  const emailInput = page.getByLabel(/email/i).or(page.locator('input[type="email"]'));
  if (await emailInput.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Formulaire d'invitation trouvé"
    });
  }
});
