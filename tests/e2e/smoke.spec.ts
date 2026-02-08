import { test, expect } from "@playwright/test";

test("Smoke: login client -> portal accessible", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal/);
});
