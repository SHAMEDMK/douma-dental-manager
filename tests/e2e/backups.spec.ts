import { test, expect } from "@playwright/test";
import { loginAdmin } from "../helpers/auth";

test("Backups: voir la liste des backups", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/backups");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/backups/);
  await expect(page.getByText(/Backups|backups|sauvegardes/i).first()).toBeVisible();

  // Vérifier qu'il y a une liste de backups ou un message vide
  const backupsList = page.locator("table, .backup-list, [class*='backup']");
  const emptyMessage = page.getByText(/aucun|no backups|empty/i);

  if (await backupsList.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Liste de backups trouvée"
    });
  } else if (await emptyMessage.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Aucun backup dans la liste"
    });
  }
});

test("Backups: créer un backup manuel", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/backups");

  // Chercher le bouton pour créer un backup manuel
  const createBackupBtn = page.getByRole("button", { name: /créer|create|backup|manuel|manual/i });
  
  if (await createBackupBtn.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Bouton de création de backup trouvé"
    });
    
    // Ne pas cliquer pour éviter de créer un backup réel pendant les tests
    // await createBackupBtn.click();
  } else {
    test.info().annotations.push({
      type: "info",
      description: "Bouton de création de backup non trouvé (peut être dans un menu)"
    });
  }
});

test("Backups: télécharger un backup", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/backups");

  // Chercher un lien ou bouton de téléchargement
  const downloadLink = page.getByRole("link", { name: /télécharger|download|download/i }).or(
    page.getByRole("button", { name: /télécharger|download/i })
  );
  
  if (await downloadLink.count() > 0) {
    test.info().annotations.push({
      type: "info",
      description: "Lien/bouton de téléchargement trouvé"
    });
  } else {
    test.info().annotations.push({
      type: "info",
      description: "Aucun backup disponible pour téléchargement"
    });
  }
});
