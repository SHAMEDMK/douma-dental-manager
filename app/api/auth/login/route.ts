import { NextRequest, NextResponse } from 'next/server'
import { loginAction } from '@/app/actions/auth'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'
import { logRateLimitExceeded } from '@/lib/audit-security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/login
 * Login endpoint with rate limiting
 * Wrapper around loginAction server action
 */
export async function POST(request: NextRequest) {
  // Rate limiting for login (stricter)
  const rateLimitResponse = await withRateLimit(request, RATE_LIMIT_PRESETS.LOGIN)
  if (rateLimitResponse) {
    // Additional audit log for rate limit on login
    try {
      const body = await request.json().catch(() => ({}))
      await logRateLimitExceeded(
        '/api/auth/login',
        body.email || 'unknown',
        request.headers
      )
    } catch (auditError) {
      console.error('Failed to log rate limit on login:', auditError)
    }
    return rateLimitResponse
  }

  try {
    const body = await request.json()
    const formData = new FormData()
    formData.append('email', body.email || '')
    formData.append('password', body.password || '')

    // Call the server action
    const result = await loginAction(null, formData)

    if (result?.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la connexion' },
      { status: 500 }
    )
  }
}
