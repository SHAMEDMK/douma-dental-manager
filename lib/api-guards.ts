/**
 * Standard security guards for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logSecurityEvent } from './audit-security'

type AdminRole = 'ADMIN' | 'COMPTABLE' | 'MAGASINIER'

/**
 * Guard for admin routes (ADMIN, COMPTABLE, MAGASINIER)
 * Returns null if authorized, or NextResponse with error if not
 */
export async function requireAdminAuth(
  request: NextRequest,
  allowedRoles: AdminRole[] = ['ADMIN', 'COMPTABLE', 'MAGASINIER']
): Promise<NextResponse | null> {
  const session = await getSession()
  
  // 401: No session
  if (!session) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    )
  }

  // 403: Wrong role
  if (!allowedRoles.includes(session.role as AdminRole)) {
    try {
      await logSecurityEvent(
        'UNAUTHORIZED_ACCESS',
        request.nextUrl.pathname,
        {
          reason: `Rôle requis: ${allowedRoles.join(', ')} (actuel: ${session.role})`,
          path: request.nextUrl.pathname,
        },
        request.headers,
        session
      )
    } catch (auditError) {
      // Don't fail if audit logging fails
      console.error('Failed to log unauthorized access:', auditError)
    }
    
    return NextResponse.json(
      { error: 'Accès refusé' },
      { status: 403 }
    )
  }

  return null // Authorized
}

/**
 * Guard for client routes (CLIENT only)
 */
export async function requireClientAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const session = await getSession()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Non authentifié' },
      { status: 401 }
    )
  }

  if (session.role !== 'CLIENT') {
    try {
      await logSecurityEvent(
        'UNAUTHORIZED_ACCESS',
        request.nextUrl.pathname,
        {
          reason: `Rôle requis: CLIENT (actuel: ${session.role})`,
          path: request.nextUrl.pathname,
        },
        request.headers,
        session
      )
    } catch (auditError) {
      console.error('Failed to log unauthorized access:', auditError)
    }
    
    return NextResponse.json(
      { error: 'Accès refusé' },
      { status: 403 }
    )
  }

  return null
}
