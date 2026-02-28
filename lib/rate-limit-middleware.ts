/**
 * Rate limiting middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from './rate-limit'
import { logRateLimitExceeded } from './audit-security'

// Re-export RATE_LIMIT_PRESETS for convenience
export { RATE_LIMIT_PRESETS }

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

export type RateLimitOptions = {
  /** Override identifier (ex. X-Rate-Limit-Test-Id pour isoler le bucket en E2E) */
  identifierOverride?: string
}

/**
 * Rate limiting middleware wrapper for API routes
 * Returns null if allowed, or NextResponse with 429 if rate limited
 * Automatically logs rate limit exceeded events for security audit
 *
 * Identifiant : override (E2E) > IP (x-forwarded-for / request.ip) > userId si authentifié > 'unknown'
 * Vercel serverless : IP réelle via x-forwarded-for (voir getClientIP).
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_PRESETS.DEFAULT,
  options?: RateLimitOptions
): Promise<NextResponse | null> {
  const route = new URL(request.url).pathname
  const session = await getSession()
  const ip = getClientIP(request)
  const identifier =
    options?.identifierOverride ??
    (ip !== 'unknown' ? ip : session ? `user:${session.id}` : ip)

  const result = checkRateLimit(identifier, route, config)

  if (!result.allowed) {
    if (process.env.DEBUG_RATE_LIMIT === '1') {
      console.warn('[rate-limit] exceeded', { route, identifier: identifier.startsWith('user:') ? 'user:***' : identifier })
    }
    try {
      await logRateLimitExceeded(route, identifier, request.headers)
    } catch (auditError) {
      console.error('Failed to log rate limit exceeded:', auditError)
    }

    const resetDate = new Date(result.resetAt).toISOString()
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        resetAt: resetDate
      },
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': resetDate
        }
      }
    )
  }
  
  return null
}
