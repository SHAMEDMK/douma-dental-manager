import { test, expect } from '@playwright/test'

/**
 * Vérifie que les routes /api/e2e/fixtures/* sont inaccessibles hors mode E2E.
 * Quand E2E_SEED n'est pas '1' sur le serveur, toutes les fixtures doivent répondre 404
 * (pas d'exposition des IDs en prod ou en dev sans E2E).
 *
 * En CI le serveur est lancé avec E2E_SEED=1, donc ces routes renvoient 200 ; on n'enregistre
 * le describe que lorsque E2E_SEED !== '1' pour éviter des échecs attendus.
 */
if (process.env.E2E_SEED !== '1') {
  test.describe('E2E fixtures – masquées hors E2E', () => {
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
}
