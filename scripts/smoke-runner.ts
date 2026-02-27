/**
 * Smoke-runner : checks HTTP non-UI pour staging ou prod (sans credentials).
 * Usage: BASE_URL=https://staging.example.com npx tsx scripts/smoke-runner.ts
 *        BASE_URL=http://127.0.0.1:3000 npx tsx scripts/smoke-runner.ts
 *
 * - GET /api/health → 200 (or 503 if DB down; 401 if HEALTHCHECK_TOKEN set = warn)
 * - GET /api/admin/export/orders sans auth → 401 + { error: "Non authentifié" }
 * - GET /api/e2e/fixtures/* → 404 (E2E_SEED != 1 on server = fixtures must be hidden)
 *
 * Checks requiring admin session (e.g. export 413 with EXPORT_MAX_ROWS=1) are manual or E2E.
 * Exit 0 if all required checks pass, 1 otherwise.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000'

const results: { name: string; ok: boolean; detail?: string }[] = []

async function check(
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>
): Promise<void> {
  try {
    const out = await fn()
    results.push({ name, ok: out.ok, detail: out.detail })
  } catch (e) {
    results.push({ name, ok: false, detail: e instanceof Error ? e.message : String(e) })
  }
}

async function main() {
  await check('GET /api/health → 200 (or 503)', async () => {
    const res = await fetch(`${BASE_URL}/api/health`, { method: 'GET' })
    if (res.status === 401) {
      return { ok: true, detail: 'Endpoint protected by HEALTHCHECK_TOKEN (OK)' }
    }
    if (res.status === 200) {
      const body = await res.json().catch(() => ({}))
      if (body?.ok === true) return { ok: true }
      return { ok: true, detail: '200 without ok field' }
    }
    if (res.status === 503) return { ok: false, detail: '503 (DB or server error)' }
    return { ok: false, detail: `status ${res.status}` }
  })

  await check('GET /api/admin/export/orders sans auth → 401 + Non authentifié', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/export/orders`, { method: 'GET' })
    if (res.status !== 401) {
      return { ok: false, detail: `expected 401, got ${res.status}` }
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.toLowerCase().includes('application/json')) {
      return { ok: false, detail: 'expected JSON body' }
    }
    const body = await res.json().catch(() => ({}))
    if (body?.error !== 'Non authentifié') {
      return { ok: false, detail: `expected error "Non authentifié", got ${JSON.stringify(body?.error)}` }
    }
    return { ok: true }
  })

  await check('GET /api/e2e/fixtures/clientA-invoice-id → 404 (fixtures hidden)', async () => {
    const res = await fetch(`${BASE_URL}/api/e2e/fixtures/clientA-invoice-id`, { method: 'GET' })
    if (res.status !== 404) {
      return { ok: false, detail: `expected 404 (E2E fixtures must be hidden when E2E_SEED!=1), got ${res.status}` }
    }
    return { ok: true }
  })

  // Print summary
  console.log('\n--- Smoke runner summary ---')
  console.log(`BASE_URL: ${BASE_URL}\n`)
  for (const r of results) {
    const status = r.ok ? 'OK' : 'FAIL'
    const detail = r.detail ? ` (${r.detail})` : ''
    console.log(`  [${status}] ${r.name}${detail}`)
  }
  const allOk = results.every((r) => r.ok)
  console.log(allOk ? '\nAll checks passed.' : '\nSome checks failed.')
  process.exit(allOk ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
