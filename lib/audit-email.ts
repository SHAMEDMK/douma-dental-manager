/**
 * Audit logging for emails
 * Provides structured logging for all email operations (sent, failed, etc.)
 */

import { createAuditLog } from './audit'

export interface EmailAuditData {
  to: string
  from: string
  subject: string
  emailType: string
  success: boolean
  mode: 'DEV' | 'PRODUCTION'
  resendId?: string
  error?: string
  metadata?: Record<string, any>
}

/**
 * Log a successfully sent email
 */
export async function logEmailSent(data: EmailAuditData): Promise<void> {
  try {
    await createAuditLog({
      action: 'EMAIL_SENT',
      entityType: 'EMAIL',
      details: {
        to: data.to,
        from: data.from,
        subject: data.subject,
        emailType: data.emailType,
        mode: data.mode,
        resendId: data.resendId,
        timestamp: new Date().toISOString(),
        ...(data.metadata || {})
      }
    })
    
    // Enhanced console logging in dev mode
    if (data.mode === 'DEV' || process.env.NODE_ENV === 'development') {
      console.log('✅ [EMAIL AUDIT] Email logged:', {
        type: data.emailType,
        to: data.to,
        subject: data.subject,
        mode: data.mode
      })
    }
  } catch (error) {
    // Non-blocking: don't fail email sending if audit fails
    console.warn('Failed to log email sent to audit:', error)
  }
}

/**
 * Log a failed email attempt
 */
export async function logEmailFailed(data: EmailAuditData): Promise<void> {
  try {
    await createAuditLog({
      action: 'EMAIL_FAILED',
      entityType: 'EMAIL',
      details: {
        to: data.to,
        from: data.from,
        subject: data.subject,
        emailType: data.emailType,
        error: data.error || 'Unknown error',
        timestamp: new Date().toISOString(),
        ...(data.metadata || {})
      }
    })
    
    // Enhanced console logging
    console.error('❌ [EMAIL AUDIT] Email failure logged:', {
      type: data.emailType,
      to: data.to,
      subject: data.subject,
      error: data.error
    })
  } catch (error) {
    // Non-blocking: don't fail if audit logging fails
    console.warn('Failed to log email failure to audit:', error)
  }
}
