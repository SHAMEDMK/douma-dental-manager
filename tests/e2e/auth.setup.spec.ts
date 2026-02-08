import { test } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Doit correspondre à playwright.config.ts baseURL pour éviter problème cookie (localhost vs 127.0.0.1)
const BASE_URL = 'http://127.0.0.1:3000'
const AUTH_DIR = path.join(process.cwd(), '.auth')

async function loginAndSaveState(
  browser: import('@playwright/test').Browser,
  role: 'admin' | 'client' | 'comptable',
  statePath: string
) {
  const context = await browser.newContext({ baseURL: BASE_URL })
  const page = await context.newPage()
  await page.goto('/login')
  await page.waitForSelector('input[name="email"]', { timeout: 15000 })
  if (role === 'admin') {
    await page.fill('input[name="email"]', 'admin@douma.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/admin/, { timeout: 20000 })
  } else if (role === 'client') {
    await page.fill('input[name="email"]', 'client@dental.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/portal/, { timeout: 20000 })
  } else {
    await page.fill('input[name="email"]', 'compta@douma.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/comptable/, { timeout: 20000 })
  }
  await context.storageState({ path: statePath })
  await context.close()
}

test('enregistrer les états d’authentification (admin, client, comptable)', async ({ browser }) => {
  fs.mkdirSync(AUTH_DIR, { recursive: true })
  await loginAndSaveState(browser, 'admin', path.join(AUTH_DIR, 'admin.json'))
  await loginAndSaveState(browser, 'client', path.join(AUTH_DIR, 'client.json'))
  await loginAndSaveState(browser, 'comptable', path.join(AUTH_DIR, 'comptable.json'))
})
