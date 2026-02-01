/**
 * Email Audit Utilities
 * 
 * Provides helper functions for email audit logging and debugging
 */

import { createAuditLog } from './audit'

export interface EmailAuditDetails {
  to: string
  subject: string
  emailType: string
  success: boolean
  emailId?: string
  error?: string
  duration?: number
  metadata?: Record<string, any>
}

/**
 * Log email send attempt (success or failure)
 */
export async function logEmailAttempt(details: EmailAuditDetails): Promise<void> {
  try {
    await createAuditLog({
      action: details.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
      entityType: 'EMAIL',
      details: {
        to: details.to,
        subject: details.subject,
        type: details.emailType,
        emailId: details.emailId,
        error: details.error,
        duration: details.duration ? `${details.duration}ms` : undefined,
        ...details.metadata
      }
    })
  } catch (error) {
    // Non-blocking: don't fail email sending if audit fails
    console.error('Failed to log email attempt:', error)
  }
}

/**
 * Get email statistics from audit logs
 * Useful for debugging and monitoring
 */
export async function getEmailStats(timeRange?: { from: Date; to: Date }) {
  const { prisma } = await import('./prisma')
  
  const where: any = {
    action: { in: ['EMAIL_SENT', 'EMAIL_FAILED'] }
  }
  
  if (timeRange) {
    where.createdAt = {
      gte: timeRange.from,
      lte: timeRange.to
    }
  }
  
  const [sent, failed, recent] = await Promise.all([
    prisma.auditLog.count({
      where: { ...where, action: 'EMAIL_SENT' }
    }),
    prisma.auditLog.count({
      where: { ...where, action: 'EMAIL_FAILED' }
    }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        action: true,
        details: true,
        createdAt: true
      }
    })
  ])
  
  return {
    sent,
    failed,
    successRate: sent + failed > 0 ? (sent / (sent + failed)) * 100 : 0,
    recent
  }
}
