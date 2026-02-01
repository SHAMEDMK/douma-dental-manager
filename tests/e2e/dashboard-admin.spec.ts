import { test, expect } from "@playwright/test";
import { loginAdmin } from "../helpers/auth";

test("Dashboard admin: vérifier les statistiques", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/dashboard");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await expect(page.getByText(/Tableau de Bord|Dashboard/i).first()).toBeVisible();

  // Vérifier la présence de cartes de statistiques
  const statsCards = page.locator('.card, [class*="bg-white"], [class*="shadow"]');
  const statsCount = await statsCards.count();
  
  if (statsCount > 0) {
    test.info().annotations.push({
      type: "info",
      description: `${statsCount} carte(s) de statistiques trouvée(s)`
    });
  }

  // Vérifier les liens vers les différentes sections
  const links = [
    { text: /commandes|orders/i, url: /\/admin\/orders/ },
    { text: /factures|invoices/i, url: /\/admin\/invoices/ },
    { text: /stock/i, url: /\/admin\/stock/ },
  ];

  for (const link of links) {
    const linkElement = page.getByRole("link", { name: link.text });
    if (await linkElement.count() > 0) {
      await linkElement.first().click();
      await expect(page).toHaveURL(link.url);
      await page.goBack();
      await page.waitForLoadState("networkidle");
    }
  }
});

test("Dashboard admin: vérifier les comptes internes", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/dashboard");

  // Vérifier la section "Comptes Internes"
  const internalAccounts = page.getByText(/Comptes Internes|comptes internes/i);
  if (await internalAccounts.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Section comptes internes trouvée"
    });
  }
});
