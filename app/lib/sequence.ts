import type { PrismaClient, Prisma } from '@prisma/client'

/** Client Prisma ou client de transaction (tx) — les deux exposent globalSequence. */
type PrismaClientLike = PrismaClient | Prisma.TransactionClient

/**
 * Numérotation ERP unifiée (nouveaux documents) : PREFIX-YYYY-NNNN
 * Exemples : CMD-2026-0001, FAC-2026-0003, BL-2026-0002, PO-2026-0001
 *
 * Les anciens numéros en base (ex. FAC-20260312-0002, CMD-20260114-0029) ne sont pas modifiés.
 *
 * Les helpers get*FromOrderNumber acceptent encore CMD-YYYYMMDD-NNNN (legacy) pour dériver
 * BL/FAC/DEV cohérents avec une commande historique.
 *
 * IMPORTANT: bump doit être appelé dans une transaction Prisma.
 */

function formatYYYYMMDD(date: Date) {
  const yyyy = date.getFullYear().toString()
  const mm = (date.getMonth() + 1).toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

async function bump(prisma: PrismaClientLike, key: string) {
  if (!prisma || !prisma.globalSequence) {
    throw new Error(
      'Prisma client not properly initialized. Please run: npx prisma generate && npx prisma migrate dev'
    )
  }

  await prisma.globalSequence.upsert({
    where: { key },
    update: {},
    create: { key, seq: 0 },
  })

  const sequence = await prisma.globalSequence.update({
    where: { key },
    data: { seq: { increment: 1 } },
  })

  return sequence.seq as number
}

/** CMD-YYYY-0001 */
export async function getNextOrderNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `ORDER-${year}`
  const seq = await bump(prisma, key)
  return `CMD-${year}-${seq.toString().padStart(4, '0')}`
}

/** FAC-YYYY-0001 */
export async function getNextInvoiceNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `INVOICE-${year}`
  const seq = await bump(prisma, key)
  return `FAC-${year}-${seq.toString().padStart(4, '0')}`
}

/** BL-YYYY-0001 */
export async function getNextDeliveryNoteNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `DELIVERY-${year}`
  const seq = await bump(prisma, key)
  return `BL-${year}-${seq.toString().padStart(4, '0')}`
}

/** PO-YYYY-0001 (Commande fournisseur) */
export async function getNextPurchaseOrderNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `PURCHASE_ORDER-${year}`
  const seq = await bump(prisma, key)
  return `PO-${year}-${seq.toString().padStart(4, '0')}`
}

const SUPPLIER_SEQ_KEY = 'SUPPLIER'

/** SUP-0001 (code fournisseur, séquence globale). À appeler dans une transaction Prisma. */
export async function getNextSupplierCode(prisma: PrismaClientLike): Promise<string> {
  const seq = await bump(prisma, SUPPLIER_SEQ_KEY)
  return `SUP-${seq.toString().padStart(4, '0')}`
}

/**
 * Extrait la partie centrale et la séquence d'un n° commande CMD-…
 * - Nouveau : CMD-2026-0001 → year 2026, seq 0001
 * - Legacy : CMD-20260114-0029 → ymd 20260114, seq 0029
 */
export function parseCmdOrderNumber(orderNumber: string | null | undefined): {
  middle: string
  seq: string
} | null {
  if (orderNumber == null || orderNumber === '') return null
  const s = orderNumber.trim()
  const legacy = /^CMD-(\d{8})-(\d{4})$/.exec(s)
  if (legacy) return { middle: legacy[1], seq: legacy[2] }
  const modern = /^CMD-(\d{4})-(\d{4})$/.exec(s)
  if (modern) return { middle: modern[1], seq: modern[2] }
  return null
}

/**
 * Generate delivery note number based on order number (même séquence que la commande).
 * CMD-2026-0049 → BL-2026-0049 ; CMD-20260114-0029 → BL-20260114-0029 (legacy)
 */
export function getDeliveryNoteNumberFromOrderNumber(orderNumber: string | null | undefined, orderCreatedAt: Date): string {
  const parsed = parseCmdOrderNumber(orderNumber)
  if (parsed) {
    return `BL-${parsed.middle}-${parsed.seq}`
  }
  const ymd = formatYYYYMMDD(orderCreatedAt)
  if (orderNumber == null || orderNumber === '') {
    return `BL-${ymd}-UNKNOWN`
  }
  return `BL-${ymd}-0000`
}

/**
 * Devis PDF : même suffixe que la commande.
 * CMD-2026-0049 → DEV-2026-0049
 */
export function getQuoteNumberFromOrderNumber(orderNumber: string | null, orderCreatedAt: Date): string {
  const parsed = parseCmdOrderNumber(orderNumber)
  if (parsed) {
    return `DEV-${parsed.middle}-${parsed.seq}`
  }
  const ymd = formatYYYYMMDD(orderCreatedAt)
  if (orderNumber == null || orderNumber === '') {
    return `DEV-${ymd}-UNKNOWN`
  }
  return `DEV-${ymd}-0000`
}

/**
 * Facture liée à la commande : même suffixe que la commande.
 * CMD-2026-0049 → FAC-2026-0049
 */
export function getInvoiceNumberFromOrderNumber(orderNumber: string | null, orderCreatedAt: Date): string {
  const parsed = parseCmdOrderNumber(orderNumber)
  if (parsed) {
    return `FAC-${parsed.middle}-${parsed.seq}`
  }
  const ymd = formatYYYYMMDD(orderCreatedAt)
  if (orderNumber == null || orderNumber === '') {
    return `FAC-${ymd}-UNKNOWN`
  }
  return `FAC-${ymd}-0000`
}
