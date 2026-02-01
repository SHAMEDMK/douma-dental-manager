import type { PrismaClient, Prisma } from '@prisma/client'

/** Client Prisma ou client de transaction (tx) — les deux exposent globalSequence. */
type PrismaClientLike = PrismaClient | Prisma.TransactionClient

/**
 * Global sequence per YEAR (not per day)
 * Display includes date (YYYYMMDD) but sequence increments continuously across the year.
 * Examples:
 *  CMD-20260104-0001, CMD-20260105-0002 ...
 *  FAC-20260104-0001 ...
 *  BL-20260104-0001 ...
 *
 * IMPORTANT: Must be called inside a Prisma transaction.
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

  // Ensure record exists
  await prisma.globalSequence.upsert({
    where: { key },
    update: {},
    create: { key, seq: 0 },
  })

  // Atomic increment (inside transaction)
  const sequence = await prisma.globalSequence.update({
    where: { key },
    data: { seq: { increment: 1 } },
  })

  return sequence.seq as number
}

/** CMD-YYYYMMDD-0001 */
export async function getNextOrderNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `ORDER-${year}` // resets each year, but not each day/month/client
  const seq = await bump(prisma, key)
  return `CMD-${formatYYYYMMDD(date)}-${seq.toString().padStart(4, '0')}`
}

/** FAC-YYYYMMDD-0001 */
export async function getNextInvoiceNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `INVOICE-${year}`
  const seq = await bump(prisma, key)
  return `FAC-${formatYYYYMMDD(date)}-${seq.toString().padStart(4, '0')}`
}

/** BL-YYYYMMDD-0001 */
export async function getNextDeliveryNoteNumber(prisma: PrismaClientLike, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `DELIVERY-${year}`
  const seq = await bump(prisma, key)
  return `BL-${formatYYYYMMDD(date)}-${seq.toString().padStart(4, '0')}`
}

/**
 * Generate delivery note number based on order number
 * Uses the same sequence number as the order
 * Example: CMD-20260114-0029 -> BL-20260114-0029
 */
export function getDeliveryNoteNumberFromOrderNumber(orderNumber: string | null, orderCreatedAt: Date): string {
  if (!orderNumber) {
    // Fallback: use order ID if orderNumber is null
    return `BL-${formatYYYYMMDD(orderCreatedAt)}-UNKNOWN`
  }

  // Extract sequence number from order number (e.g., "0029" from "CMD-20260114-0029")
  const match = orderNumber.match(/-(\d{4})$/)
  if (match) {
    const seq = match[1]
    return `BL-${formatYYYYMMDD(orderCreatedAt)}-${seq}`
  }

  // Fallback: if format doesn't match, use date only
  return `BL-${formatYYYYMMDD(orderCreatedAt)}-0000`
}

/**
 * Generate invoice number based on order number
 * Uses the same sequence number as the order
 * Example: CMD-20260118-0049 -> FAC-20260118-0049
 */
export function getInvoiceNumberFromOrderNumber(orderNumber: string | null, orderCreatedAt: Date): string {
  if (!orderNumber) {
    // Fallback: use order ID if orderNumber is null
    return `FAC-${formatYYYYMMDD(orderCreatedAt)}-UNKNOWN`
  }

  // Extract sequence number from order number (e.g., "0049" from "CMD-20260118-0049")
  const match = orderNumber.match(/-(\d{4})$/)
  if (match) {
    const seq = match[1]
    return `FAC-${formatYYYYMMDD(orderCreatedAt)}-${seq}`
  }

  // Fallback: if format doesn't match, use date only
  return `FAC-${formatYYYYMMDD(orderCreatedAt)}-0000`
}