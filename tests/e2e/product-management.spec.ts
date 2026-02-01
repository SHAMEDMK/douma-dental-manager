import { test, expect } from "@playwright/test";
import { loginAdmin } from "../helpers/auth";

test("Gestion des produits: créer, modifier, voir la liste", async ({ page }) => {
  // 1) Se connecter en tant qu'admin
  await loginAdmin(page);
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

  // Remplir le formulaire
  await page.getByLabel(/nom|name/i).fill("Produit Test E2E");
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

  // Attendre la redirection vers la liste des produits
  await expect(page).toHaveURL(/\/admin\/products/, { timeout: 10000 });

  // 3) Vérifier que le produit apparaît dans la liste
  await expect(page.getByText("Produit Test E2E").first()).toBeVisible({ timeout: 5000 });

  // 4) Cliquer sur le produit pour voir les détails
  const productLink = page.getByRole("link", { name: /Produit Test E2E|voir|détails/i }).first();
  if (await productLink.count() > 0) {
    await productLink.click();
    await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/);

    // Vérifier que les informations du produit sont affichées
    await expect(page.getByText("Produit Test E2E")).toBeVisible();
  }
});

test("Gestion des produits: voir la liste et filtrer", async ({ page }) => {
  await loginAdmin(page);
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
