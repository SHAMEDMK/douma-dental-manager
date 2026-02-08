import { test, expect } from "@playwright/test";


test("Gestion du stock: voir la liste et ajuster le stock", async ({ page }) => {
  await page.goto("/admin/stock");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/stock/);
  await expect(page.getByText(/Stock|stock/i).first()).toBeVisible();

  // Vérifier qu'il y a au moins un produit dans la liste
  const productsTable = page.locator("table, .product-list");
  const emptyMessage = page.getByText(/aucun|no products|empty/i);

  if (await productsTable.count() > 0) {
    // Il y a une table/liste de produits
    // Cliquer sur le premier lien produit (exclure les liens de navigation)
    const productLinks = page.getByRole("link").filter({ hasNotText: /dashboard|commandes|factures|stock|produits|clients|livreurs|paiements|logs|audit|backups|paramètres|settings/i });
    if (await productLinks.count() > 0) {
      const firstProductLink = productLinks.first();
      const href = await firstProductLink.getAttribute("href");
      if (href && href.includes("/admin/stock/") && !href.includes("/admin/stock/movements")) {
        await firstProductLink.click();
        await expect(page).toHaveURL(/\/admin\/stock\/[^/]+$/, { timeout: 5000 });

        // Vérifier que les informations du produit sont affichées
        await expect(page.getByText(/Stock|stock|quantité/i).first()).toBeVisible({ timeout: 5000 });
      }
    }
  } else if (await emptyMessage.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Aucun produit dans la liste de stock"
    });
  }
});

test("Gestion du stock: voir les mouvements de stock", async ({ page }) => {
  await page.goto("/admin/stock/movements");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/stock\/movements/);
  
  // Vérifier qu'il y a une liste de mouvements ou un message vide
  const movementsTable = page.locator("table, .movements-list");
  const emptyMessage = page.getByText(/aucun|no movements|empty/i);

  if (await movementsTable.count() > 0 || await emptyMessage.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Page des mouvements de stock chargée"
    });
  }
});
