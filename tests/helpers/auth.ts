import { Page, expect } from "@playwright/test";

/**
 * Same selectors and flow as the passing inline logins (e.g. admin-approval.spec, auth.spec).
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 25000,
      waitUntil: "commit",
    });
  } catch {
    const formError = await page.getByText("Identifiants invalides").textContent().catch(() => null);
    const genericError = await page.getByText("Une erreur est survenue").first().textContent().catch(() => null);
    if (formError) throw new Error("Connexion échouée: Identifiants invalides");
    if (genericError) throw new Error("Connexion échouée: Une erreur est survenue");
    throw new Error(`Navigation échouée. URL actuelle: ${page.url()}`);
  }
  await expect(page).not.toHaveURL(/\/login/);
}

export async function loginClient(page: Page) {
  await login(page, "client@dental.com", process.env.ADMIN_PASSWORD || "password123");
}

export async function loginAdmin(page: Page) {
  await login(page, "admin@douma.com", process.env.ADMIN_PASSWORD || "password");
}

export async function loginDeliveryAgent(page: Page) {
  await login(page, "stock@douma.com", process.env.ADMIN_PASSWORD || "password123");
}
