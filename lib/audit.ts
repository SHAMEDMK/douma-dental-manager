import { prisma } from './prisma'

/**
 * Types d'actions auditées
 */
export type AuditAction =
  // Commandes
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_ITEM_ADDED'
  | 'ORDER_ITEM_REMOVED'
  | 'ORDER_ITEM_UPDATED'
  // Factures
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'INVOICE_STATUS_CHANGED'
  // Paiements
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_DELETED'
  // Produits
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_VARIANT_CREATED'
  | 'PRODUCT_VARIANT_UPDATED'
  | 'PRODUCT_VARIANT_DELETED'
  // Stock
  | 'STOCK_ADJUSTED'
  // Clients
  | 'CLIENT_CREATED'
  | 'CLIENT_UPDATED'
  | 'CLIENT_DELETED'
  // Authentification
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  // Autres
  | 'SETTINGS_UPDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ACCOUNTANT_CREATED'
  | 'ACCOUNTANT_DELETED'
  | 'COMMERCIAL_CREATED'
  | 'DELIVERY_AGENT_CREATED'
  | 'DELIVERY_AGENT_DELETED'
  | 'DELIVERY_AGENT_REASSIGNED'
  | 'INVITATION_CREATED'
  | 'ORDER_APPROVED'
  | 'PAYMENT_UPDATED'
  | 'USER_TYPE_UPDATED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET'
  // Demandes client
  | 'CLIENT_REQUEST_CREATED'
  | 'CLIENT_REQUEST_STATUS_CHANGED'
  // Sécurité
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED_ACCESS'
  // Emails
  | 'EMAIL_SENT'
  | 'EMAIL_FAILED'

/**
 * Types d'entités
 */
export type AuditEntityType =
  | 'ORDER'
  | 'INVOICE'
  | 'PAYMENT'
  | 'PRODUCT'
  | 'PRODUCT_VARIANT'
  | 'STOCK'
  | 'USER'
  | 'CLIENT'
  | 'CLIENT_REQUEST'
  | 'SETTINGS'
  | 'EMAIL'
  | 'SECURITY'

/**
 * Informations utilisateur pour les logs
 */
export interface UserInfo {
  id?: string
  email?: string
  role?: string
}

/**
 * Options pour créer un log d'audit
 */
export interface AuditLogOptions {
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  userId?: string
  userEmail?: string
  userRole?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}

/**
 * Créer un log d'audit
 * Cette fonction est non-bloquante : elle ne lance pas d'erreur si le log échoue
 */
export async function createAuditLog(options: AuditLogOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId || null,
        userId: options.userId || null,
        userEmail: options.userEmail || null,
        userRole: options.userRole || null,
        details: options.details ? JSON.stringify(options.details) : null,
        ipAddress: options.ipAddress || null,
        userAgent: options.userAgent || null,
      },
    })
  } catch (error) {
    // Log error but don't fail the operation
    // This ensures that audit logging doesn't break the main workflow
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Helper pour créer un log avec les informations de session
 */
export async function auditLogWithSession(
  options: Omit<AuditLogOptions, 'userId' | 'userEmail' | 'userRole'>,
  session: UserInfo | null
): Promise<void> {
  await createAuditLog({
    ...options,
    userId: session?.id,
    userEmail: session?.email,
    userRole: session?.role,
  })
}

/**
 * Helper pour logger les changements de statut avec détails
 */
export async function logStatusChange(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  oldStatus: string,
  newStatus: string,
  session: UserInfo | null,
  additionalDetails?: Record<string, any>
): Promise<void> {
  await auditLogWithSession(
    {
      action,
      entityType,
      entityId,
      details: {
        oldStatus,
        newStatus,
        ...additionalDetails,
      },
    },
    session
  )
}

/**
 * Helper pour logger les créations d'entités
 */
export async function logEntityCreation(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  session: UserInfo | null,
  details?: Record<string, any>
): Promise<void> {
  await auditLogWithSession(
    {
      action,
      entityType,
      entityId,
      details,
    },
    session
  )
}

/**
 * Helper pour logger les mises à jour d'entités
 */
export async function logEntityUpdate(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  session: UserInfo | null,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
): Promise<void> {
  await auditLogWithSession(
    {
      action,
      entityType,
      entityId,
      details: {
        oldValues,
        newValues,
      },
    },
    session
  )
}

/**
 * Helper pour logger les suppressions d'entités
 */
export async function logEntityDeletion(
  action: AuditAction,
  entityType: AuditEntityType,
  entityId: string,
  session: UserInfo | null,
  deletedData?: Record<string, any>
): Promise<void> {
  await auditLogWithSession(
    {
      action,
      entityType,
      entityId,
      details: {
        deletedData,
      },
    },
    session
  )
}

/**
 * Obtenir l'adresse IP depuis les headers de requête
 */
export function getIpAddress(headers: Headers | Record<string, string>): string | undefined {
  if (headers instanceof Headers) {
    const forwarded = headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }
    return headers.get('x-real-ip') || undefined
  }
  
  // Fallback for plain objects
  const forwarded = headers['x-forwarded-for']
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim()
  }
  return headers['x-real-ip']
}

/**
 * Obtenir le user agent depuis les headers de requête
 */
export function getUserAgent(headers: Headers | Record<string, string>): string | undefined {
  if (headers instanceof Headers) {
    return headers.get('user-agent') || undefined
  }
  return headers['user-agent']
}
