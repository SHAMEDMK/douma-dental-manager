import { NextRequest, NextResponse } from 'next/server'
import { getSession, logout } from '@/lib/auth'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/logout
 * Logout endpoint with audit logging
 */
export async function POST(request: NextRequest) {
  // Rate limiting for logout (moderate)
  const rateLimitResponse = await withRateLimit(request, {
    maxRequests: 30,
    windowMs: 60 * 1000 // 30 requests per minute
  })
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const session = await getSession()

    if (session) {
      // Log audit: User logout
      try {
        const { auditLogWithSession } = await import('@/lib/audit')
        await auditLogWithSession(
          {
            action: 'LOGOUT',
            entityType: 'USER',
            entityId: session.id,
          },
          session
        )
      } catch (auditError) {
        console.error('Failed to log logout:', auditError)
      }
    }

    // Perform logout
    await logout()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Logout API error:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la déconnexion' },
      { status: 500 }
    )
  }
}