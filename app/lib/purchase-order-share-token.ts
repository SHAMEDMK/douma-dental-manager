import { SignJWT, jwtVerify } from 'jose'

function getAppBaseUrl(): string {
  const url = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return url.replace(/\/$/, '')
}

const TOKEN_PURPOSE = 'po-public-pdf'
const TOKEN_TTL = '90 days'

function getSigningKey(): Uint8Array {
  const secret = process.env.JWT_SECRET?.trim()
  if (!secret) {
    throw new Error('JWT_SECRET is required for purchase order share tokens')
  }
  return new TextEncoder().encode(secret)
}

/** JWT signé (90 jours) pour télécharger un bon de commande sans compte admin. */
export async function createPurchaseOrderShareToken(purchaseOrderId: string): Promise<string> {
  return new SignJWT({ po: purchaseOrderId, purpose: TOKEN_PURPOSE })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getSigningKey())
}

/** Retourne l’ID de la PO si le jeton est valide, sinon null. */
export async function verifyPurchaseOrderShareToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningKey())
    if (payload.purpose !== TOKEN_PURPOSE) return null
    const poId = payload.po
    return typeof poId === 'string' && poId.length > 0 ? poId : null
  } catch {
    return null
  }
}

/** Normalise le jeton lu depuis l’URL (query, path, copier-coller e-mail). */
export function normalizeShareTokenInput(
  raw: string | string[] | null | undefined
): string | null {
  if (raw == null) return null
  const value = (Array.isArray(raw) ? raw[0] : raw).trim()
  if (!value) return null
  try {
    return decodeURIComponent(value).trim()
  } catch {
    return value
  }
}

export function buildPurchaseOrderPublicPageUrl(
  purchaseOrderId: string,
  token: string
): string {
  const base = getAppBaseUrl()
  return `${base}/public/purchases/${purchaseOrderId}/${token}`
}

export function buildPurchaseOrderPublicPdfApiUrl(
  purchaseOrderId: string,
  token: string
): string {
  const base = getAppBaseUrl()
  return `${base}/api/pdf/public/purchases/${purchaseOrderId}/${token}`
}

export function buildPurchaseOrderPublicPdfExportUrl(
  purchaseOrderId: string,
  token: string
): string {
  const base = getAppBaseUrl()
  return `${base}/pdf-export/public/purchases/${purchaseOrderId}/${token}`
}
