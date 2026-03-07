import { test, expect } from '@playwright/test'

/**
 * Vérifie que les routes /api/e2e/fixtures/* sont inaccessibles hors mode E2E.
 * Quand E2E_SEED n'est pas '1' sur le serveur, toutes les fixtures doivent répondre 404
 * (pas d'exposition des IDs en prod ou en dev sans E2E).
 *
 * En CI le serveur est toujours lancé avec E2E_SEED=1, donc ces routes renvoient 200.
 * On skip ce describe en mode E2E pour éviter des échecs attendus ; le garde est assuré
 * par le code (if (process.env.E2E_SEED !== '1') return 404) et peut être vérifié en local
 * sans E2E_SEED.
 */
test.describe.skip(
  process.env.E2E_SEED === '1',
  'E2E fixtures – masquées hors E2E',
  () => {
  test('GET /api/e2e/fixtures/invoice-id returns 404 when not in E2E mode', async ({ request }) => {
    const res = await request.get('/api/e2e/fixtures/invoice-id')
    expect(res.status()).toBe(404)
  })

  test('GET /api/e2e/fixtures/clientA-order-id returns 404 when not in E2E mode', async ({ request }) => {
    const res = await request.get('/api/e2e/fixtures/clientA-order-id')
    expect(res.status()).toBe(404)
  })

  test('GET /api/e2e/fixtures/clientA-invoice-id returns 404 when not in E2E mode', async ({ request }) => {
    const res = await request.get('/api/e2e/fixtures/clientA-invoice-id')
    expect(res.status()).toBe(404)
  })
})
