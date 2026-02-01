/**
 * Simple in-memory rate limiter for API routes
 * 
 * Note: For production, consider using Redis or a dedicated rate limiting service
 * This implementation uses in-memory storage and is suitable for single-instance deployments
 */

type RateLimitConfig = {
  maxRequests: number // Maximum number of requests
  windowMs: number // Time window in milliseconds
}

type RequestRecord = {
  count: number
  resetAt: number // Timestamp when the counter resets
}

// In-memory storage: IP -> route -> RequestRecord
const requestStore = new Map<string, Map<string, RequestRecord>>()

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [ip, routes] of requestStore.entries()) {
    for (const [route, record] of routes.entries()) {
      if (record.resetAt < now) {
        routes.delete(route)
      }
    }
    if (routes.size === 0) {
      requestStore.delete(ip)
    }
  }
}, CLEANUP_INTERVAL)

/**
 * Check if a request should be rate limited
 * @param identifier - Client identifier (IP address or user ID)
 * @param route - Route identifier (e.g., '/api/auth/login')
 * @param config - Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  route: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const key = `${identifier}:${route}`
  
  // Get or create route map for this identifier
  let routes = requestStore.get(identifier)
  if (!routes) {
    routes = new Map()
    requestStore.set(identifier, routes)
  }
  
  // Get or create record for this route
  let record = routes.get(route)
  
  if (!record || record.resetAt < now) {
    // Create new record or reset expired one
    record = {
      count: 0,
      resetAt: now + config.windowMs
    }
    routes.set(route, record)
  }
  
  // Increment counter
  record.count++
  
  const remaining = Math.max(0, config.maxRequests - record.count)
  const allowed = record.count <= config.maxRequests
  
  return {
    allowed,
    remaining,
    resetAt: record.resetAt
  }
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: Request): string {
  // Check various headers for IP (in order of preference)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }
  
  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }
  
  // Fallback (not reliable in production behind proxy)
  return 'unknown'
}

/**
 * Rate limit configuration presets
 * Updated with safe production values
 */
export const RATE_LIMIT_PRESETS = {
  // Login: 10 attempts per 5 minutes (anti-bruteforce)
  LOGIN: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000 // 5 minutes
  },
  
  // PDF generation: 10 requests per minute (heavy operation, Playwright)
  PDF: {
    maxRequests: 10,
    windowMs: 60 * 1000 // 1 minute
  },
  
  // Invitations: 20 requests per 10 minutes
  INVITE: {
    maxRequests: 20,
    windowMs: 10 * 60 * 1000 // 10 minutes
  },
  
  // Admin actions: 60 requests per minute
  ADMIN: {
    maxRequests: 60,
    windowMs: 60 * 1000 // 1 minute
  },
  
  // Default: 100 requests per minute
  DEFAULT: {
    maxRequests: 100,
    windowMs: 60 * 1000 // 1 minute
  }
}

/**
 * Rate limit function with scope-based key generation
 * @param scope - Scope identifier (e.g., 'LOGIN', 'PDF', 'ADMIN')
 * @param identifier - Client identifier (IP or user ID)
 * @param pathnameGroup - Grouped pathname (e.g., 'PDF', 'LOGIN')
 * @param config - Rate limit configuration
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function rateLimit(
  scope: string,
  identifier: string,
  pathnameGroup: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${scope}:${identifier}:${pathnameGroup}`
  return checkRateLimit(identifier, key, config)
}
