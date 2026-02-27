import { test, expect } from "@playwright/test";

test("Smoke: portal accessible", async ({ page }) => {
  await page.goto("/portal");
  await expect(page).toHaveURL(/\/portal/);
});

test("Security headers: X-Content-Type-Options present on document", async ({ request }) => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000";
  const response = await request.get(`${baseURL}/portal`);
  expect(response.ok()).toBe(true);
  const headers = response.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("Health: GET /api/health returns 200, ok:true and x-request-id", async ({ request }) => {
  const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || "http://127.0.0.1:3000";
  const response = await request.get(`${baseURL}/api/health`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.ts).toBeDefined();
  expect(body.env).toBeDefined();
  const requestId = response.headers()["x-request-id"];
  expect(requestId).toBeTruthy();
  expect(typeof requestId).toBe("string");
});
