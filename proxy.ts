import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from './lib/auth'
import { rateLimit, getClientIP, RATE_LIMIT_PRESETS } from './lib/rate-limit'
import { logRateLimitExceeded } from './lib/audit-security'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ============================================
  // RATE LIMITING (before auth checks)
  // ============================================
  
  // Get client IP
  const clientIP = getClientIP(request)
  
  // Get pathname group for rate limiting
  let pathnameGroup: string
  if (pathname.startsWith('/api/pdf')) {
    pathnameGroup = 'PDF'
  } else if (pathname.startsWith('/login')) {
    pathnameGroup = 'LOGIN'
  } else if (pathname.startsWith('/invite')) {
    pathnameGroup = 'INVITE'
  } else if (pathname.startsWith('/admin')) {
    pathnameGroup = 'ADMIN'
  } else {
    pathnameGroup = 'GENERAL'
  }

  // Get session for user-based rate limiting (if available)
  const token = request.cookies.get('session')?.value
  let session: any = null
  try {
    session = token ? await verifyToken(token) : null
  } catch {
    // Token invalid, will be handled later
    session = null
  }

  // Apply rate limiting rules
  // Note: Only apply strict rate limiting to sensitive actions, not page navigation (GET requests)
  const method = request.method
  const isPageNavigation = method === 'GET' && !pathname.startsWith('/api')
  
  let rateLimitResult: { allowed: boolean; remaining: number; resetAt: number } | null = null
  let rateLimitConfig = RATE_LIMIT_PRESETS.DEFAULT

  if (pathnameGroup === 'LOGIN') {
    // LOGIN: 10 req / 5min par IP (only for POST requests - login attempts)
    // Skip rate limiting for GET requests (page display)
    if (method === 'POST') {
      rateLimitConfig = RATE_LIMIT_PRESETS.LOGIN
      rateLimitResult = rateLimit('LOGIN', clientIP, pathnameGroup, rateLimitConfig)
    }
    // For GET requests, skip rate limiting (normal page navigation)
  } else if (pathnameGroup === 'PDF') {
    // PDF: 10 req / 1min par USER si session, sinon par IP (always apply)
    rateLimitConfig = RATE_LIMIT_PRESETS.PDF
    const identifier = session?.id ? `user:${session.id}` : `ip:${clientIP}`
    rateLimitResult = rateLimit('PDF', identifier, pathnameGroup, rateLimitConfig)
  } else if (pathnameGroup === 'INVITE') {
    // INVITE: 20 req / 10min par IP (always apply)
    rateLimitConfig = RATE_LIMIT_PRESETS.INVITE
    rateLimitResult = rateLimit('INVITE', clientIP, pathnameGroup, rateLimitConfig)
  } else if (pathnameGroup === 'ADMIN') {
    // ADMIN: Only rate limit non-GET requests (actions) and API routes
    // Skip rate limiting for page navigation (GET requests to pages)
    // Note: API routes are excluded from this middleware, so they handle their own rate limiting
    if (!isPageNavigation) {
      rateLimitConfig = RATE_LIMIT_PRESETS.ADMIN
      const identifier = session?.id ? `user:${session.id}` : `ip:${clientIP}`
      rateLimitResult = rateLimit('ADMIN', identifier, pathnameGroup, rateLimitConfig)
    }
    // For GET requests to pages, skip rate limiting (normal navigation)
  }

  // If rate limited, return 429
  if (rateLimitResult && !rateLimitResult.allowed) {
    // Log audit
    try {
      await logRateLimitExceeded(
        pathname,
        session?.id || clientIP,
        Object.fromEntries(request.headers.entries())
      )
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Failed to log rate limit exceeded:', auditError)
    }

    const resetSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many requests', message: 'Rate limit exceeded. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(resetSeconds),
          'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
          'X-RateLimit-Remaining': String(rateLimitResult.remaining),
          'X-RateLimit-Reset': new Date(rateLimitResult.resetAt).toISOString(),
        },
      }
    )
  }

  // ============================================
  // AUTHENTICATION & AUTHORIZATION
  // ============================================

  // 0. Exclude all API routes (including /api/pdf) - but rate limiting already applied above
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 1. Exclude public routes
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/invite') ||
    pathname.startsWith('/_next') ||
    pathname === '/'
  ) {
    return NextResponse.next()
  }

  // 2. Verify token (reuse from rate limiting if available, otherwise verify again)
  const payload = session || (token ? await verifyToken(token) : null)

  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Role-based protection
  const role = payload.role as string
  const adminRoles = ['ADMIN', 'COMPTABLE', 'MAGASINIER']

  if (pathname.startsWith('/admin') && !adminRoles.includes(role)) {
    return NextResponse.redirect(new URL('/portal', request.url))
  }

  if (pathname.startsWith('/portal') && role !== 'CLIENT') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  if (pathname.startsWith('/magasinier') && role !== 'MAGASINIER') {
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'COMPTABLE') {
      return NextResponse.redirect(new URL('/comptable/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  if (pathname.startsWith('/comptable') && role !== 'COMPTABLE') {
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else if (role === 'MAGASINIER') {
      return NextResponse.redirect(new URL('/magasinier/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
