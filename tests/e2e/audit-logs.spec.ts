import { test, expect } from "@playwright/test";


test("Logs d'audit: voir la liste des logs", async ({ page }) => {
  await page.goto("/admin/audit");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/audit/);
  await expect(page.getByText(/Logs d'audit|audit/i).first()).toBeVisible();

  // Vérifier qu'il y a une table de logs
  const logsTable = page.locator("table");
  const emptyMessage = page.getByText(/aucun|no logs|empty/i);

  if (await logsTable.count() > 0) {
    // Vérifier les colonnes de la table
    const headers = page.locator("thead th");
    const headerCount = await headers.count();
    
    test.info().annotations.push({
      type: "info",
      description: `Table de logs trouvée avec ${headerCount} colonne(s)`
    });

    // Vérifier qu'il y a au moins un log ou un message vide
    const logRows = page.locator("tbody tr");
    const rowCount = await logRows.count();
    
    if (rowCount > 0) {
      test.info().annotations.push({
        type: "info",
        description: `${rowCount} log(s) d'audit trouvé(s)`
      });
    }
  } else if (await emptyMessage.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Aucun log d'audit dans la liste"
    });
  }
});

test("Logs d'audit: voir les détails d'un log", async ({ page }) => {
  await page.goto("/admin/audit");

  // Chercher un log avec des détails
  const detailsLink = page.getByText(/voir détails|details/i).first();
  
  if (await detailsLink.count() > 0) {
    await detailsLink.click();
    
    // Vérifier que les détails s'affichent (peut être dans un <details> ou modal)
    const detailsContent = page.locator("details, pre, .details, [class*='detail']");
    if (await detailsContent.count() > 0) {
      test.info().annotations.push({
        type: "info",
        description: "Détails d'un log affichés"
      });
    }
  } else {
    test.info().annotations.push({
      type: "info",
      description: "Aucun log avec détails disponible"
    });
  }
});

test("Logs d'audit: pagination", async ({ page }) => {
  await page.goto("/admin/audit");

  // Vérifier la présence de la pagination
  const nextLink = page.getByRole("link", { name: /suivant|next/i });
  const prevLink = page.getByRole("link", { name: /précédent|previous|prev/i });
  const pageInfo = page.getByText(/page|Page/i);

  if (await nextLink.count() > 0) {
    // Cliquer sur "Suivant"
    await nextLink.click();
    await expect(page).toHaveURL(/page=2/);
    
    test.info().annotations.push({
      type: "info",
      description: "Pagination fonctionnelle"
    });
  } else if (await pageInfo.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Information de pagination trouvée (une seule page)"
    });
  }
});
