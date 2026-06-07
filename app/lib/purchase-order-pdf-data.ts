import { prisma } from '@/lib/prisma'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyée',
  PARTIALLY_RECEIVED: 'Part. réceptionnée',
  RECEIVED: 'Réceptionnée',
  CANCELLED: 'Annulée',
}

export async function getPurchaseOrderPdfData(id: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    select: {
      orderNumber: true,
      createdAt: true,
      sentAt: true,
      status: true,
      supplier: {
        select: {
          code: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          ice: true,
          contact: true,
        },
      },
      items: {
        select: {
          id: true,
          quantityOrdered: true,
          product: { select: { name: true, sku: true } },
          productVariant: { select: { name: true, sku: true } },
        },
        orderBy: { id: 'asc' },
      },
    },
  })

  if (!po) return null

  return {
    orderNumber: po.orderNumber,
    createdAt: po.createdAt,
    sentAt: po.sentAt,
    statusLabel: STATUS_LABELS[po.status] ?? po.status,
    supplier: po.supplier,
    items: po.items.map((item) => ({
      id: item.id,
      quantityOrdered: item.quantityOrdered,
      product: item.product,
      productVariant: item.productVariant,
    })),
  }
}
