/**
 * Rate limiting middleware for Next.js API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP, RATE_LIMIT_PRESETS } from './rate-limit'
import { logRateLimitExceeded } from './audit-security'

// Re-export RATE_LIMIT_PRESETS for convenience
export { RATE_LIMIT_PRESETS }

export type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

/**
 * Rate limiting middleware wrapper for API routes
 * Returns null if allowed, or NextResponse with 429 if rate limited
 * Automatically logs rate limit exceeded events for security audit
 */
export async function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMIT_PRESETS.DEFAULT
): Promise<NextResponse | null> {
  const clientIP = getClientIP(request)
  const route = new URL(request.url).pathname
  
  const result = checkRateLimit(clientIP, route, config)
  
  if (!result.allowed) {
    // Log rate limit exceeded for security audit
    try {
      await logRateLimitExceeded(route, clientIP, request.headers)
    } catch (auditError) {
      // Don't fail the request if audit logging fails
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
