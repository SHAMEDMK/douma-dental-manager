/**
 * Create or reset order CMD-E2E-CONFIRMED for E2E accounting-close test 2 (deliver order → new invoice).
 * Usage: E2E_SEED=1 tsx scripts/create-order-e2e-confirmed.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ORDER_NUMBER = 'CMD-E2E-CONFIRMED'

async function main() {
  const client = await prisma.user.findFirst({ where: { email: 'client@dental.com', role: 'CLIENT' } })
  const product = await prisma.product.findFirst({ where: { stock: { gte: 1 } } })
  if (!client || !product) {
    console.warn('E2E: client or product not found, skip create order')
    await prisma.$disconnect()
    return
  }
  const existing = await prisma.order.findUnique({
    where: { orderNumber: ORDER_NUMBER },
    include: { items: true, invoice: true, deliveryNoteDoc: true },
  })
  if (existing) {
    // Supprimer facture + paiements + BL pour permettre un reset complet (bouton Préparer visible)
    if (existing.invoice) {
      await prisma.payment.deleteMany({ where: { invoiceId: existing.invoice.id } })
      await prisma.invoice.delete({ where: { id: existing.invoice.id } })
    }
    if (existing.deliveryNoteDoc) {
      await prisma.deliveryNote.delete({ where: { id: existing.deliveryNoteDoc.id } })
    }
    await prisma.orderItem.deleteMany({ where: { orderId: existing.id } })
    await prisma.order.update({
      where: { id: existing.id },
      data: {
        status: 'CONFIRMED',
        total: 50,
        requiresAdminApproval: false,
        deliveryNoteNumber: null,
      },
    })
    await prisma.orderItem.create({
      data: {
        orderId: existing.id,
        productId: product.id,
        quantity: 1,
        priceAtTime: 50,
        costAtTime: 0,
      },
    })
    console.log('E2E: order', ORDER_NUMBER, 'reset to CONFIRMED')
  } else {
    await prisma.order.create({
      data: {
        userId: client.id,
        orderNumber: ORDER_NUMBER,
        status: 'CONFIRMED',
        total: 50,
        requiresAdminApproval: false,
        items: {
          create: [{ productId: product.id, quantity: 1, priceAtTime: 50, costAtTime: 0 }],
        },
      },
    })
    console.log('E2E: order', ORDER_NUMBER, 'created (CONFIRMED)')
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.warn('E2E: create-order-e2e-confirmed failed:', e)
  process.exit(1)
})
