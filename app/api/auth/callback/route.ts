import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { login } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

/** Build redirect base URL from the client's Host so cookie and redirect stay on same host (E2E: 127.0.0.1). */
function getRedirectBase(request: NextRequest): string {
  const hostHeader = request.headers.get('host')
  if (hostHeader) {
    const protocol = request.nextUrl.protocol
    return `${protocol}//${hostHeader}`
  }
  const u = new URL(request.url)
  const host = u.hostname === '0.0.0.0' ? 'localhost' : u.hostname
  return `${u.protocol}//${host}${u.port ? ':' + u.port : ''}`
}

/**
 * POST /api/auth/callback
 * Form POST login endpoint that sets the session cookie and returns 303 redirect.
 * Used by the login page form so the browser performs a full navigation (E2E and normal use).
 */
export async function POST(request: NextRequest) {
  const base = getRedirectBase(request)

  try {
    const hostHeader = request.headers.get('host')
    const hostname = hostHeader ? hostHeader.split(':')[0] : new URL(request.url).hostname
    const isLocal = hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '0.0.0.0'
    const forceRateLimit = request.headers.get('X-Force-Rate-Limit') === 'true'

    // Skip rate limit for local/E2E unless test forces it (pour tester le rate limit)
    if (!isLocal || forceRateLimit) {
      const rateLimitResponse = await withRateLimit(request, RATE_LIMIT_PRESETS.LOGIN)
      if (rateLimitResponse) {
        return NextResponse.redirect(`${base}/login?error=rate`, 303)
      }
    }

    let email: string
    let password: string
    try {
      const formData = await request.formData()
      email = (formData.get('email') as string)?.trim()?.toLowerCase() || ''
      password = (formData.get('password') as string) || ''
    } catch {
      return NextResponse.redirect(`${base}/login?error=invalid`, 303)
    }

    if (!email || !password) {
      return NextResponse.redirect(`${base}/login?error=invalid`, 303)
    }

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.redirect(`${base}/login?error=invalid`, 303)
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      try {
        const { auditLogWithSession } = await import('@/lib/audit')
        await auditLogWithSession(
          {
            action: 'LOGIN_FAILED',
            entityType: 'USER',
            entityId: user.id,
            details: { email, reason: 'Invalid password' },
          },
          { email: user.email, role: user.role }
        )
      } catch (auditError) {
        console.error('Failed to log failed login:', auditError)
      }
      return NextResponse.redirect(`${base}/login?error=invalid`, 303)
    }

    await login({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userType: user.userType || null,
    })

    try {
      const { auditLogWithSession } = await import('@/lib/audit')
      await auditLogWithSession(
        { action: 'LOGIN', entityType: 'USER', entityId: user.id },
        { id: user.id, email: user.email, role: user.role }
      )
    } catch (auditError) {
      console.error('Failed to log login:', auditError)
    }

    let target: string
    if (user.role === 'ADMIN' || user.role === 'COMMERCIAL') {
      target = '/admin'
    } else if (user.role === 'COMPTABLE') {
      target = '/comptable/dashboard'
    } else if (user.role === 'MAGASINIER') {
      target = user.userType === 'MAGASINIER' ? '/magasinier/dashboard' : '/delivery'
    } else {
      target = '/portal'
    }

    return NextResponse.redirect(`${base}${target}`, 303)
  } catch (err) {
    console.error('[auth/callback] Error:', err)
    return NextResponse.redirect(`${base}/login?error=server`, 303)
  }
}
