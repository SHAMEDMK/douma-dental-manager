import { test, expect } from "@playwright/test";
import { loginClient } from "../helpers/auth";

test("Smoke: login client -> portal accessible", async ({ page }) => {
  await loginClient(page);
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal/);
});
