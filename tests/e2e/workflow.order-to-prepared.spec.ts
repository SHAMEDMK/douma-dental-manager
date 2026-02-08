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

    await adminPage.goto(`${baseURL}/admin/orders`);
    const row = adminPage.locator("tr").filter({ hasText: "CMD-E2E-PREPARED" });
    await expect(row).toBeVisible({ timeout: 10000 });
    const orderLink = row.getByRole("link", { name: /voir détails/i }).first();
    await expect(orderLink).toBeVisible();
    await orderLink.click();
    await expect(adminPage).toHaveURL(/\/admin\/orders\/[^/]+$/);

    await adminPage.waitForLoadState("domcontentloaded");

    // When the order has an invoice (e.g. INV-E2E-0001 from seed), the status select is hidden
    // and "Modifications bloquées (facture verrouillée)" is shown. Accept either case.
    const selectStatus = adminPage.locator("select").filter({ has: adminPage.locator('option[value="PREPARED"]') }).first();
    const hasSelect = await selectStatus.count() > 0;
    if (hasSelect) {
      await expect(selectStatus).toHaveValue("PREPARED", { timeout: 5000 });
    } else {
      await expect(adminPage.getByText(/Préparée|Modifications bloquées|facture verrouillée/i)).toBeVisible({ timeout: 5000 });
    }

    await expect(adminPage.getByText(/BL-E2E-0001|BL-\d{8}-\d{4}/i)).toBeVisible();
  } finally {
    await adminContext.close();
  }
});
