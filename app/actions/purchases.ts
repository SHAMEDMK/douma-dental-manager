'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { AUTH_FORBIDDEN_ERROR_MESSAGE, AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE } from '@/lib/auth-errors'
import { getNextPurchaseOrderNumber } from '@/app/lib/sequence'
import { revalidatePath } from 'next/cache'
import { isAccountingClosedFor } from '@/app/lib/accounting-close'

const PO_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
} as const

const PURCHASE_ROLES = {
  create: ['ADMIN', 'COMMERCIAL'],
  receive: ['ADMIN', 'MAGASINIER'],
  cancel: ['ADMIN'],
}

function hasRole(session: { role: string }, roles: string[]): boolean {
  return roles.includes(session.role)
}

export type PurchaseOrderItemInput = {
  productId: string
  productVariantId?: string | null
  quantityOrdered: number
  unitCost: number
}

export type PurchaseReceiptItemInput = {
  purchaseOrderItemId: string
  quantityReceived: number
}

/**
 * Créer un fournisseur. Rôles: ADMIN, COMMERCIAL.
 */
export async function createSupplierAction(data: {
  name: string
  contact?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  ice?: string
  notes?: string
}): Promise<{ supplierId?: string; error?: string }> {
  const session = await getSession()
  if (!session || !hasRole(session, PURCHASE_ROLES.create)) {
    return { error: !session ? AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE : AUTH_FORBIDDEN_ERROR_MESSAGE }
  }
  if (!data.name?.trim()) {
    return { error: 'Le nom du fournisseur est obligatoire' }
  }
  try {
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name.trim(),
        contact: data.contact?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        ice: data.ice?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    })
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation('SUPPLIER_CREATED', 'SUPPLIER', supplier.id, session as any, { name: supplier.name })
    } catch (_) {}
    revalidatePath('/admin')
    return { supplierId: supplier.id }
  } catch (e: any) {
    console.error('createSupplierAction:', e)
    return { error: e.message || 'Erreur lors de la création du fournisseur' }
  }
}

/**
 * Modifier un fournisseur. Rôles: ADMIN, COMMERCIAL.
 */
export async function updateSupplierAction(
  supplierId: string,
  data: {
    name?: string
    contact?: string | null
    email?: string | null
    phone?: string | null
    address?: string | null
    city?: string | null
    ice?: string | null
    notes?: string | null
  }
): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !hasRole(session, PURCHASE_ROLES.create)) {
    return { error: !session ? AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE : AUTH_FORBIDDEN_ERROR_MESSAGE }
  }
  if (!data.name?.trim()) {
    return { error: 'Le nom du fournisseur est obligatoire' }
  }
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) return { error: 'Fournisseur introuvable' }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: data.name.trim(),
        contact: data.contact?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        city: data.city?.trim() || null,
        ice: data.ice?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    })
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate('SUPPLIER_UPDATED', 'SUPPLIER', supplierId, session as any, { name: supplier.name }, { name: data.name.trim() })
    } catch (_) {}
    revalidatePath('/admin')
    return {}
  } catch (e: any) {
    console.error('updateSupplierAction:', e)
    return { error: e.message || 'Erreur lors de la mise à jour du fournisseur' }
  }
}

/**
 * Créer une commande fournisseur (statut DRAFT). Rôles: ADMIN, COMMERCIAL.
 */
export async function createPurchaseOrderAction(
  supplierId: string,
  items: PurchaseOrderItemInput[]
): Promise<{ purchaseOrderId?: string; error?: string }> {
  const session = await getSession()
  if (!session || !hasRole(session, PURCHASE_ROLES.create)) {
    return { error: !session ? AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE : AUTH_FORBIDDEN_ERROR_MESSAGE }
  }
  if (!items?.length || items.some((i) => !i.productId || i.quantityOrdered <= 0 || i.unitCost < 0)) {
    return { error: 'Articles invalides : produit, quantité > 0 et coût ≥ 0 requis' }
  }
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) return { error: 'Fournisseur introuvable' }

    const po = await prisma.$transaction(async (tx) => {
      const orderNumber = await getNextPurchaseOrderNumber(tx)
      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          status: PO_STATUS.DRAFT,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              productVariantId: i.productVariantId || null,
              quantityOrdered: i.quantityOrdered,
              unitCost: i.unitCost,
            })),
          },
        },
        include: { items: true },
      })
      return order
    })
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation('PURCHASE_ORDER_CREATED', 'PURCHASE_ORDER', po.id, session as any, {
        orderNumber: po.orderNumber,
        supplierId,
        itemCount: po.items.length,
      })
    } catch (_) {}
    revalidatePath('/admin')
    return { purchaseOrderId: po.id }
  } catch (e: any) {
    console.error('createPurchaseOrderAction:', e)
    return { error: e.message || 'Erreur lors de la création de la commande' }
  }
}

/**
 * Envoyer la commande au fournisseur (DRAFT → SENT). Rôles: ADMIN, COMMERCIAL.
 */
export async function sendPurchaseOrderAction(purchaseOrderId: string): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !hasRole(session, PURCHASE_ROLES.create)) {
    return { error: !session ? AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE : AUTH_FORBIDDEN_ERROR_MESSAGE }
  }
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: { id: true, status: true, createdAt: true },
    })
    if (!po) return { error: 'Commande fournisseur introuvable' }
    if (po.status !== PO_STATUS.DRAFT) {
      return { error: 'Seules les commandes en brouillon peuvent être envoyées' }
    }
    const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } })
    if (isAccountingClosedFor(po.createdAt, settings?.accountingLockedUntil)) {
      return { error: 'Période comptable clôturée pour cette commande' }
    }
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: PO_STATUS.SENT, sentAt: new Date() },
    })
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange('PURCHASE_ORDER_STATUS_CHANGED', 'PURCHASE_ORDER', po.id, PO_STATUS.DRAFT, PO_STATUS.SENT, session as any)
    } catch (_) {}
    revalidatePath('/admin')
    return {}
  } catch (e: any) {
    console.error('sendPurchaseOrderAction:', e)
    return { error: e.message || 'Erreur' }
  }
}

/**
 * Réceptionner des marchandises. Crée PurchaseReceipt, met à jour quantityReceived,
 * crée StockMovement (source PURCHASE_RECEIPT), met à jour le statut de la PO.
 * Rôles: ADMIN, MAGASINIER.
 */
export async function createPurchaseReceiptAction(
  purchaseOrderId: string,
  items: PurchaseReceiptItemInput[]
): Promise<{ purchaseReceiptId?: string; error?: string }> {
  const session = await getSession()
  if (!session || !hasRole(session, PURCHASE_ROLES.receive)) {
    return { error: !session ? AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE : AUTH_FORBIDDEN_ERROR_MESSAGE }
  }
  const validItems = items.filter((i) => i.quantityReceived > 0)
  if (!validItems.length) return { error: 'Aucune quantité à réceptionner' }

  try {
    const receipt = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: {
          items: {
            include: { product: true, productVariant: true },
          },
        },
      })
      if (!po) throw new Error('Commande fournisseur introuvable')
      if (po.status === PO_STATUS.RECEIVED) {
        throw new Error('Cette commande est déjà entièrement réceptionnée')
      }
      if (po.status === PO_STATUS.CANCELLED) {
        throw new Error('Impossible de réceptionner une commande annulée')
      }

      // Agréger par ligne pour éviter doublons et incohérences
      const byItemId = new Map<string, { item: (typeof po.items)[0]; qty: number }>()
      for (const input of validItems) {
        const item = po.items.find((i) => i.id === input.purchaseOrderItemId)
        if (!item) throw new Error(`Ligne de commande introuvable: ${input.purchaseOrderItemId}`)
        const prev = byItemId.get(item.id)
        const qty = (prev?.qty ?? 0) + input.quantityReceived
        byItemId.set(item.id, { item, qty })
      }
      const receiptItems: { purchaseOrderItemId: string; quantityReceived: number; item: (typeof po.items)[0] }[] = []
      for (const [, { item, qty }] of byItemId) {
        const remaining = item.quantityOrdered - item.quantityReceived
        if (qty > remaining) {
          throw new Error(
            `Quantité supérieure au reste à recevoir pour "${item.product.name}" (reste: ${remaining})`
          )
        }
        receiptItems.push({ purchaseOrderItemId: item.id, quantityReceived: qty, item })
      }

      const receipt = await tx.purchaseReceipt.create({
        data: {
          purchaseOrderId,
          createdBy: session.id,
          items: {
            create: receiptItems.map((r) => ({
              purchaseOrderItemId: r.purchaseOrderItemId,
              quantityReceived: r.quantityReceived,
            })),
          },
        },
        include: { items: true },
      })

      for (const { quantityReceived, item } of receiptItems) {
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { quantityReceived: item.quantityReceived + quantityReceived },
        })

        const productId = item.productId
        const productVariantId = item.productVariantId
        const isVariant = !!productVariantId

        if (isVariant) {
          const variant = await tx.productVariant.findUnique({
            where: { id: productVariantId! },
            select: { stock: true },
          })
          if (!variant) throw new Error('Variante introuvable')
          await tx.productVariant.update({
            where: { id: productVariantId! },
            data: { stock: variant.stock + quantityReceived },
          })
        } else {
          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { stock: true },
          })
          if (!product) throw new Error('Produit introuvable')
          await tx.product.update({
            where: { id: productId },
            data: { stock: product.stock + quantityReceived },
          })
        }

        await tx.stockMovement.create({
          data: {
            productId,
            productVariantId: productVariantId || null,
            type: 'IN',
            source: 'PURCHASE_RECEIPT',
            quantity: quantityReceived,
            reference: receipt.id,
            createdBy: session.id,
          },
        })
      }

      const updatedPo = await tx.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        include: { items: true },
      })
      if (!updatedPo) throw new Error('PO introuvable')
      const allReceived = updatedPo.items.every((i) => i.quantityReceived >= i.quantityOrdered)
      const anyReceived = updatedPo.items.some((i) => i.quantityReceived > 0)
      const newStatus = allReceived ? PO_STATUS.RECEIVED : anyReceived ? PO_STATUS.PARTIALLY_RECEIVED : po.status
      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: newStatus },
      })

      return receipt
    })

    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation('PURCHASE_RECEIPT_CREATED', 'PURCHASE_RECEIPT', receipt.id, session as any, {
        purchaseOrderId,
        itemCount: receipt.items.length,
      })
    } catch (_) {}
    revalidatePath('/admin')
    revalidatePath('/admin/stock')
    return { purchaseReceiptId: receipt.id }
  } catch (e: any) {
    console.error('createPurchaseReceiptAction:', e)
    return { error: e.message || 'Erreur lors de la réception' }
  }
}

/**
 * Annuler une commande fournisseur. Rôles: ADMIN uniquement.
 * Autorisé uniquement si DRAFT ou SENT sans aucune réception.
 */
export async function cancelPurchaseOrderAction(purchaseOrderId: string): Promise<{ error?: string }> {
  const session = await getSession()
  if (!session || !hasRole(session, PURCHASE_ROLES.cancel)) {
    return { error: !session ? AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE : AUTH_FORBIDDEN_ERROR_MESSAGE }
  }
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { receipts: true, items: true },
    })
    if (!po) return { error: 'Commande fournisseur introuvable' }
    if (po.status === PO_STATUS.CANCELLED) return { error: 'Commande déjà annulée' }
    if (po.status === PO_STATUS.RECEIVED || po.status === PO_STATUS.PARTIALLY_RECEIVED) {
      return { error: 'Impossible d\'annuler une commande déjà réceptionnée (partiellement ou totalement)' }
    }
    const hasReceipts = po.receipts && po.receipts.length > 0
    if (hasReceipts) {
      return { error: 'Impossible d\'annuler une commande ayant des réceptions' }
    }
    const settings = await prisma.companySettings.findUnique({ where: { id: 'default' } })
    if (isAccountingClosedFor(po.createdAt, settings?.accountingLockedUntil)) {
      return { error: 'Période comptable clôturée pour cette commande' }
    }
    const oldStatus = po.status
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: PO_STATUS.CANCELLED },
    })
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange('PURCHASE_ORDER_CANCELLED', 'PURCHASE_ORDER', po.id, oldStatus, PO_STATUS.CANCELLED, session as any)
    } catch (_) {}
    revalidatePath('/admin')
    return {}
  } catch (e: any) {
    console.error('cancelPurchaseOrderAction:', e)
    return { error: e.message || 'Erreur' }
  }
}
