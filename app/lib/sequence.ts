/**
 * Get the next sequential order number for a given date
 * Format: CMD-YYYYMMDD-0001, CMD-YYYYMMDD-0002, etc.
 * This function is atomic and collision-free - must be called within a transaction
 * @param prisma - PrismaClient or transaction client (from $transaction callback)
 */
export async function getNextOrderNumber(
  prisma: any,
  date: Date = new Date()
): Promise<string> {
  if (!prisma || !prisma.dailySequence) {
    throw new Error('Prisma client not properly initialized. Please run: npx prisma generate && npx prisma db push')
  }
  
  const dateKey = formatDateKey(date)
  
  // Ensure record exists first (idempotent - safe if already exists)
  await prisma.dailySequence.upsert({
    where: { date: dateKey },
    update: {},
    create: {
      date: dateKey,
      orderSeq: 0,
      invoiceSeq: 0
    }
  })
  
  // Then increment atomically (this happens within the same transaction)
  const sequence = await prisma.dailySequence.update({
    where: { date: dateKey },
    data: {
      orderSeq: { increment: 1 }
    }
  })
  
  return `CMD-${dateKey}-${sequence.orderSeq.toString().padStart(4, '0')}`
}

/**
 * Get the next sequential invoice number for a given date
 * Format: INV-YYYYMMDD-0001, INV-YYYYMMDD-0002, etc.
 * This function is atomic and collision-free - must be called within a transaction
 * @param prisma - PrismaClient or transaction client (from $transaction callback)
 */
export async function getNextInvoiceNumber(
  prisma: any,
  date: Date = new Date()
): Promise<string> {
  if (!prisma || !prisma.dailySequence) {
    throw new Error('Prisma client not properly initialized. Please run: npx prisma generate && npx prisma db push')
  }
  
  const dateKey = formatDateKey(date)
  
  // Ensure record exists first (idempotent - safe if already exists)
  await prisma.dailySequence.upsert({
    where: { date: dateKey },
    update: {},
    create: {
      date: dateKey,
      orderSeq: 0,
      invoiceSeq: 0
    }
  })
  
  // Then increment atomically (this happens within the same transaction)
  const sequence = await prisma.dailySequence.update({
    where: { date: dateKey },
    data: {
      invoiceSeq: { increment: 1 }
    }
  })
  
  return `INV-${dateKey}-${sequence.invoiceSeq.toString().padStart(4, '0')}`
}

/**
 * Format a date as YYYYMMDD string
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

