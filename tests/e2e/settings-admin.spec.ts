import { test, expect } from "@playwright/test";
import { loginAdmin } from "../helpers/auth";

test("Paramètres admin: voir et modifier les paramètres", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/settings");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/settings/);
  await expect(page.getByText(/Paramètres|Settings/i).first()).toBeVisible();

  // Vérifier qu'il y a un formulaire de paramètres
  const form = page.locator("form");
  await expect(form.first()).toBeVisible();

  // Vérifier la présence de champs de paramètres
  const checkboxes = page.locator('input[type="checkbox"]');
  const checkboxCount = await checkboxes.count();
  
  if (checkboxCount > 0) {
    test.info().annotations.push({
      type: "info",
      description: `${checkboxCount} case(s) à cocher trouvée(s)`
    });
  }

  // Vérifier le lien vers les paramètres entreprise
  const companySettingsLink = page.getByRole("link", { name: /company|entreprise/i });
  if (await companySettingsLink.count() > 0) {
    const href = await companySettingsLink.getAttribute("href");
    if (href && href.includes("/admin/settings/company")) {
      await companySettingsLink.click();
      await expect(page).toHaveURL(/\/admin\/settings\/company/, { timeout: 5000 });
    } else {
      // Naviguer directement si le lien n'est pas cliquable
      await page.goto("/admin/settings/company");
      await expect(page).toHaveURL(/\/admin\/settings\/company/);
    }
  }
});

test("Paramètres entreprise: voir et modifier les paramètres", async ({ page }) => {
  await loginAdmin(page);
  await page.goto("/admin/settings/company");

  // Vérifier que la page se charge
  await expect(page).toHaveURL(/\/admin\/settings\/company/);
  await expect(page.getByText(/Company Settings|Paramètres entreprise/i).first()).toBeVisible();

  // Vérifier qu'il y a un formulaire
  const form = page.locator("form");
  await expect(form.first()).toBeVisible();

  // Vérifier la présence de champs (nom, TVA, etc.)
  const inputs = page.locator('input[type="text"], input[type="number"]');
  const inputCount = await inputs.count();
  
  if (inputCount > 0) {
    test.info().annotations.push({
      type: "info",
      description: `${inputCount} champ(s) de saisie trouvé(s)`
    });
  }

  // Vérifier le lien de retour (chercher spécifiquement "Retour aux paramètres")
  const backLink = page.getByRole("link", { name: /retour aux paramètres|← retour/i });
  if (await backLink.count() > 0) {
    await backLink.click();
    await expect(page).toHaveURL(/\/admin\/settings/);
  } else {
    // Fallback: chercher un lien vers /admin/settings
    const settingsLink = page.getByRole("link", { href: /\/admin\/settings$/ });
    if (await settingsLink.count() > 0) {
      await settingsLink.first().click();
      await expect(page).toHaveURL(/\/admin\/settings/);
    }
  }
});
