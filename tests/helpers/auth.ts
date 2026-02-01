import { Page, expect } from "@playwright/test";

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  
  // Attendre que la page soit chargée
  await page.waitForLoadState("networkidle");
  
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  
  // Cliquer et attendre la navigation
  const navigationPromise = page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 });
  await page.getByTestId("login-submit").click();
  
  // Attendre la navigation
  try {
    await navigationPromise;
  } catch (error) {
    // Si la navigation échoue, vérifier s'il y a un message d'erreur
    const errorMessage = await page.locator('text=/erreur|invalid|incorrect/i').first().textContent().catch(() => null);
    if (errorMessage) {
      throw new Error(`Connexion échouée: ${errorMessage}`);
    }
    // Vérifier l'URL actuelle
    const currentUrl = page.url();
    throw new Error(`Navigation échouée. URL actuelle: ${currentUrl}`);
  }
  
  // Vérifier qu'on n'est plus sur /login
  await expect(page).not.toHaveURL(/\/login/);
}

export async function loginClient(page: Page) {
  await login(page, "client@dental.com", process.env.ADMIN_PASSWORD || "Douma@2025!123");
}

export async function loginAdmin(page: Page) {
  await login(page, "admin@douma.com", process.env.ADMIN_PASSWORD || "Douma@2025!123");
}

export async function loginDeliveryAgent(page: Page) {
  await login(page, "stock@douma.com", process.env.ADMIN_PASSWORD || "Douma@2025!123");
}
