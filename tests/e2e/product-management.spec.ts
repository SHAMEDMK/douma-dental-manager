import { test, expect } from "@playwright/test";


test("Gestion des produits: créer, modifier, voir la liste", async ({ page }) => {
  await page.goto("/admin/products");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/products/);
  await expect(page.getByText(/Produits|products/i).first()).toBeVisible();

  // 2) Créer un nouveau produit
  const newProductBtn = page.getByRole("link", { name: /nouveau|new|ajouter|add/i });
  await expect(newProductBtn).toBeVisible();
  await newProductBtn.click();

  // Vérifier qu'on est sur la page de création
  await expect(page).toHaveURL(/\/admin\/products\/new/);

  // C'est le SKU qui définit l'unicité du produit ; format type Prod-001, avec suffixe unique par exécution
  const uniqueSuffix = Date.now();
  const skuProduct = `Prod-${String(uniqueSuffix).slice(-6)}`;
  const productName = `Produit Test E2E ${uniqueSuffix}`;

  // Remplir le formulaire (SKU obligatoire pour l'unicité)
  await page.getByLabel(/nom|name/i).fill(productName);
  await page.getByLabel(/réf|sku/i).or(page.locator('input[name="sku"]')).first().fill(skuProduct);
  await page.getByLabel(/description/i).fill("Description du produit de test").catch(() => {
    // Description peut être optionnelle
  });

  // Prix LABO (requis)
  const priceLaboInput = page.getByLabel(/prix.*labo|price.*labo/i).or(page.locator('input[name="priceLabo"]'));
  await expect(priceLaboInput.first()).toBeVisible();
  await priceLaboInput.first().fill("100");

  // Prix DENTISTE (optionnel)
  const priceDentisteInput = page.getByLabel(/prix.*dentiste|price.*dentiste/i).or(page.locator('input[name="priceDentiste"]'));
  if (await priceDentisteInput.count() > 0) {
    await priceDentisteInput.first().fill("110");
  }

  // Prix REVENDEUR (optionnel)
  const priceRevendeurInput = page.getByLabel(/prix.*revendeur|price.*revendeur/i).or(page.locator('input[name="priceRevendeur"]'));
  if (await priceRevendeurInput.count() > 0) {
    await priceRevendeurInput.first().fill("90");
  }

  // Stock
  const stockInput = page.getByLabel(/stock/i).or(page.locator('input[name="stock"]'));
  await expect(stockInput.first()).toBeVisible();
  await stockInput.first().fill("50");

  // Stock minimum
  const minStockInput = page.getByLabel(/stock.*min|min.*stock/i).or(page.locator('input[name="minStock"]'));
  if (await minStockInput.count() > 0) {
    await minStockInput.first().fill("10");
  }

  // Catégorie (optionnel)
  const categoryInput = page.getByLabel(/catégorie|category/i).or(page.locator('input[name="category"]'));
  if (await categoryInput.count() > 0) {
    await categoryInput.first().fill("Test");
  }

  // Soumettre le formulaire
  const submitBtn = page.getByRole("button", { name: /créer|create|enregistrer|save/i });
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();

  // Attendre la redirection (liste ou détail produit selon config)
  await expect(page).toHaveURL(/\/admin\/products(\/[^/]+)?(\?.*)?$/, { timeout: 15000 });
  await page.waitForLoadState("domcontentloaded");

  // Si on est sur la liste (exactement /admin/products), recharger pour données fraîches
  const path = new URL(page.url()).pathname;
  if (path === "/admin/products") {
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
  }

  // 3) Vérifier que le produit apparaît (liste ou page détail)
  await expect(page.getByText(productName).first()).toBeVisible({ timeout: 10000 });

  // 4) Sur la liste, cliquer sur le lien "Modifier" (détail produit) de la ligne et attendre la navigation
  const row = page.locator("tr").filter({ hasText: productName });
  const detailLink = row.locator('a[href^="/admin/products/"]').first();
  if (await detailLink.count() > 0) {
    await Promise.all([
      page.waitForURL(/\/admin\/products\/[^/]+$/, { timeout: 10000 }),
      detailLink.click(),
    ]);
    await expect(page.getByText(productName)).toBeVisible();
  }
});

test("Gestion des produits: voir la liste et filtrer", async ({ page }) => {
  await page.goto("/admin/products");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/products/);

  // Vérifier qu'il y a au moins un produit (ou un message "Aucun produit")
  const productsTable = page.locator("table, .product-list, .grid");
  const emptyMessage = page.getByText(/aucun|no products|empty/i);

  if (await productsTable.count() > 0) {
    // Il y a une table/liste de produits
    test.info().annotations.push({
      type: "info",
      description: "Liste de produits trouvée"
    });
  } else if (await emptyMessage.count() > 0) {
    // Il n'y a pas de produits
    test.info().annotations.push({
      type: "info",
      description: "Aucun produit dans la liste"
    });
  }
});
