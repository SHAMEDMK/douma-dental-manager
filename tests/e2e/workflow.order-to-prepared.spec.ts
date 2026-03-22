import { test, expect } from "@playwright/test";

/**
 * Vérifie qu'une commande en statut PREPARED est bien affichée avec son BL (admin).
 *
 * Ce test utilise la commande créée par le seed E2E (CMD-E2E-PREPARED). Il ne teste pas
 * le workflow complet "client crée commande → admin clique Préparer → statut PREPARED"
 * (cette transition est couverte par order-workflow.spec.ts, delivery-workflow.spec.ts,
 * full-workflow-delivery.spec.ts, workflow-complet.spec.ts).
 */
test("Workflow: commande Préparée visible avec BL (seed E2E)", async ({ browser, baseURL }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();

  try {
    await adminPage.goto(`${baseURL}/login`);
    await adminPage.fill('input[name="email"]', 'admin@douma.com');
    await adminPage.fill('input[name="password"]', 'password');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/\/admin/, { timeout: 15000 });

    // pageSize=100 pour éviter pagination ; CMD-E2E-PREPARED peut être DELIVERED si accounting-close-after-payment a livré
    await adminPage.goto(`${baseURL}/admin/orders?pageSize=100`);
    const row = adminPage.locator("tr").filter({ hasText: "CMD-E2E-PREPARED" });
    await expect(row).toBeVisible({ timeout: 10000 });
    const orderLink = row.getByRole("link", { name: /voir détails/i }).first();
    await expect(orderLink).toBeVisible();
    await orderLink.click();
    await expect(adminPage).toHaveURL(/\/admin\/orders\/[^/]+$/);

    await adminPage.waitForLoadState("domcontentloaded");

    // Order peut être PREPARED (seed) ou DELIVERED (si accounting-close-after-payment a livré)
    const selectStatus = adminPage.locator("select").filter({ has: adminPage.locator('option[value="PREPARED"]') }).first();
    const hasSelect = await selectStatus.count() > 0;
    if (hasSelect) {
      const val = await selectStatus.inputValue();
      expect(["PREPARED", "DELIVERED"]).toContain(val);
    } else {
      await expect(adminPage.getByText(/Préparée|Livrée|Modifications bloquées|facture verrouillée/i)).toBeVisible({ timeout: 5000 });
    }

    await expect(adminPage.getByText(/BL-E2E-0001|BL-\d{4}-\d{4}|BL-\d{8}-\d{4}/i)).toBeVisible();
  } finally {
    await adminContext.close();
  }
});
