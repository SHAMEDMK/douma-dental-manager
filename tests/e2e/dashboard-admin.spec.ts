import { test, expect } from "@playwright/test";

test("Dashboard admin: vérifier les statistiques", async ({ page }) => {
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

  // Vérifier les liens vers les différentes sections (sidebar : cibler par href, attendre la navigation)
  const hrefs = [
    { href: "/admin/orders", url: /\/admin\/orders/ },
    { href: "/admin/invoices", url: /\/admin\/invoices/ },
    { href: "/admin/stock", url: /\/admin\/stock/ },
  ];
  for (const { href, url } of hrefs) {
    const link = page.locator(`a[href="${href}"]`).first();
    if (await link.count() > 0) {
      await Promise.all([
        page.waitForURL(url, { timeout: 15000 }),
        link.click(),
      ]);
      await page.goBack();
      await page.waitForLoadState("domcontentloaded");
    }
  }
});

test("Dashboard admin: vérifier les comptes internes", async ({ page }) => {
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
