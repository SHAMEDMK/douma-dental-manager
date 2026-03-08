import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestId } from '@/lib/request-id'
import { withRateLimit } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

const DB_TIMEOUT_MS = 3000

/**
 * GET /api/health
 * Minimal healthcheck for monitoring. Returns { ok, ts, env } and checks DB with short timeout.
 * Optional: set HEALTHCHECK_TOKEN and call with Authorization: Bearer <token> to skip rate limit.
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)
  const authHeader = request.headers.get('authorization')
  const token = process.env.HEALTHCHECK_TOKEN
  const hasValidToken = !!token && authHeader === `Bearer ${token}`

  if (token && !hasValidToken) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: { 'x-request-id': requestId } }
    )
  }
  if (!hasValidToken) {
    const rateLimitResponse = await withRateLimit(request, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    })
    if (rateLimitResponse) return rateLimitResponse
  }

  const ts = new Date().toISOString()
  const env = process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'

  let dbOk = false
  try {
    const result = await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT_MS)
      ),
    ])
    dbOk = !!result
  } catch (error) {
    console.error(JSON.stringify({
      route: '/api/health',
      method: 'GET',
      status: 503,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }))
    return NextResponse.json(
      { ok: false, ts, env, db: 'error' },
      { status: 503, headers: { 'x-request-id': requestId } }
    )
  }

  return NextResponse.json(
    { ok: true, ts, env, db: dbOk ? 'ok' : 'unknown' },
    { status: 200, headers: { 'x-request-id': requestId } }
  )
}
