/**
 * Security audit logging helpers
 * For logging security-related events: rate limiting, unauthorized access, etc.
 */

import { createAuditLog, getIpAddress, getUserAgent } from './audit'
import type { UserInfo } from './audit'

/**
 * Log rate limit exceeded event
 */
export async function logRateLimitExceeded(
  route: string,
  identifier: string,
  headers: Headers | Record<string, string>
): Promise<void> {
  try {
    await createAuditLog({
      action: 'RATE_LIMIT_EXCEEDED',
      entityType: 'USER',
      entityId: identifier,
      userEmail: identifier.includes('@') ? identifier : undefined,
      details: {
        route,
        identifier,
        ipAddress: getIpAddress(headers),
        userAgent: getUserAgent(headers),
        timestamp: new Date().toISOString(),
      },
      ipAddress: getIpAddress(headers),
      userAgent: getUserAgent(headers),
    })
  } catch (error) {
    console.error('Failed to log rate limit exceeded:', error)
  }
}

/**
 * Log unauthorized access attempt
 */
export async function logUnauthorizedAccess(
  route: string,
  reason: string,
  headers: Headers | Record<string, string>,
  session?: UserInfo | null
): Promise<void> {
  try {
    await createAuditLog({
      action: 'UNAUTHORIZED_ACCESS',
      entityType: 'USER',
      entityId: session?.id,
      userId: session?.id,
      userEmail: session?.email,
      userRole: session?.role,
      details: {
        route,
        reason,
        ipAddress: getIpAddress(headers),
        userAgent: getUserAgent(headers),
        timestamp: new Date().toISOString(),
      },
      ipAddress: getIpAddress(headers),
      userAgent: getUserAgent(headers),
    })
  } catch (error) {
    console.error('Failed to log unauthorized access:', error)
  }
}

/**
 * Log security event (generic)
 */
export async function logSecurityEvent(
  action: string,
  route: string,
  details: Record<string, any>,
  headers: Headers | Record<string, string>,
  session?: UserInfo | null
): Promise<void> {
  try {
    await createAuditLog({
      action: action as any,
      entityType: 'USER',
      entityId: session?.id,
      userId: session?.id,
      userEmail: session?.email,
      userRole: session?.role,
      details: {
        route,
        ...details,
        ipAddress: getIpAddress(headers),
        userAgent: getUserAgent(headers),
        timestamp: new Date().toISOString(),
      },
      ipAddress: getIpAddress(headers),
      userAgent: getUserAgent(headers),
    })
  } catch (error) {
    console.error('Failed to log security event:', error)
  }
}
