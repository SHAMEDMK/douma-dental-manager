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

async function bump(prisma: any, key: string) {
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
export async function getNextOrderNumber(prisma: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `ORDER-${year}` // resets each year, but not each day/month/client
  const seq = await bump(prisma, key)
  return `CMD-${formatYYYYMMDD(date)}-${seq.toString().padStart(4, '0')}`
}

/** FAC-YYYYMMDD-0001 */
export async function getNextInvoiceNumber(prisma: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `INVOICE-${year}`
  const seq = await bump(prisma, key)
  return `FAC-${formatYYYYMMDD(date)}-${seq.toString().padStart(4, '0')}`
}

/** BL-YYYYMMDD-0001 */
export async function getNextDeliveryNoteNumber(prisma: any, date: Date = new Date()): Promise<string> {
  const year = date.getFullYear()
  const key = `DELIVERY-${year}`
  const seq = await bump(prisma, key)
  return `BL-${formatYYYYMMDD(date)}-${seq.toString().padStart(4, '0')}`
}
