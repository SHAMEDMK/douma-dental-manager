'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getPriceForSegment } from '../lib/pricing'
import { getNextOrderNumber, getNextInvoiceNumber } from '@/app/lib/sequence'
import { isInvoiceLocked, INVOICE_LOCKED_ERROR, isInvoiceNumberAlreadyAssigned, NUMBER_ALREADY_ASSIGNED_ERROR, canModifyInvoiceAmount, canModifyOrder, ORDER_NOT_MODIFIABLE_ERROR } from '@/app/lib/invoice-lock'
import { calculateInvoiceTotalTTC } from '@/app/lib/invoice-utils'

/**
 * Calculate if order requires admin approval based on admin settings
 * @param items Array of order items with priceAtTime and costAtTime
 * @param settings Admin settings (optional, will fetch if not provided)
 * @returns true if order requires admin approval
 */
async function calculateRequiresAdminApproval(
  items: Array<{ priceAtTime: number; costAtTime: number; quantity: number }>,
  settings?: { requireApprovalIfAnyNegativeLineMargin: boolean; requireApprovalIfMarginBelowPercent: boolean; marginPercentThreshold: number; requireApprovalIfOrderTotalMarginNegative: boolean } | null
): Promise<boolean> {
  // Get admin settings if not provided (with fallback to defaults if not found)
  let s = settings
  if (s === undefined) {
    try {
      const fetched = await prisma.adminSettings.findUnique({
        where: { id: 'default' }
      })
      s = fetched
    } catch (error) {
      // If table doesn't exist yet, use defaults
      console.warn('AdminSettings table not available, using defaults')
      s = null
    }
  }

  // Default settings if not found
  const defaultSettings = {
    requireApprovalIfAnyNegativeLineMargin: true,
    requireApprovalIfMarginBelowPercent: false,
    marginPercentThreshold: 0,
    requireApprovalIfOrderTotalMarginNegative: false,
  }

  s = s || defaultSettings

  // Calculate margins
  let totalRevenue = 0
  let totalCost = 0
  let hasNegativeLineMargin = false

  for (const item of items) {
    const lineRevenue = item.priceAtTime * item.quantity
    const lineCost = item.costAtTime * item.quantity
    const lineMargin = lineRevenue - lineCost

    totalRevenue += lineRevenue
    totalCost += lineCost

    // Check if this line has negative margin (only if costAtTime > 0)
    if (item.costAtTime > 0 && lineMargin < 0) {
      hasNegativeLineMargin = true
    }
  }

  const totalMargin = totalRevenue - totalCost
  const totalMarginNegative = totalMargin < 0
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0

  // Apply rules
  if (s.requireApprovalIfAnyNegativeLineMargin && hasNegativeLineMargin) {
    return true
  }

  if (s.requireApprovalIfMarginBelowPercent && marginPercent < s.marginPercentThreshold) {
    return true
  }

  if (s.requireApprovalIfOrderTotalMarginNegative && totalMarginNegative) {
    return true
  }

  return false
}

export async function createOrderAction(items: { productId: string; quantity: number }[]) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  if (items.length === 0) return { error: 'Panier vide' }

  // Get admin settings once (outside transaction for better performance)
  let adminSettings
  try {
    adminSettings = await prisma.adminSettings.findUnique({
      where: { id: 'default' }
    })
  } catch (error) {
    console.warn('AdminSettings table not available, using defaults')
    adminSettings = null
  }

  // Get company settings for VAT rate (F1: balance = encours TTC)
  let vatRate = 0.2 // Default 20%
  try {
    const companySettings = await prisma.companySettings.findUnique({
      where: { id: 'default' }
    })
    vatRate = companySettings?.vatRate ?? 0.2
  } catch (error) {
    console.warn('CompanySettings table not available, using default VAT rate 20%')
    vatRate = 0.2
  }

  // Get user segment, discountRate, balance, and creditLimit for pricing and credit check
  let segment = 'LABO' // Default fallback
  let discountRate: number | null = null
  let userBalance = 0
  let userCreditLimit = 0
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { segment: true, discountRate: true, balance: true, creditLimit: true }
    })
    segment = user?.segment || 'LABO'
    discountRate = user?.discountRate ?? null
    userBalance = user?.balance ?? 0
    userCreditLimit = user?.creditLimit ?? 0
  } catch (error: unknown) {
    // If fields don't exist yet, use defaults
    const message = error instanceof Error ? error.message : String(error)
    console.warn('User fields not available, using defaults:', message)
    segment = 'LABO'
    // Keep defaults: userBalance = 0, userCreditLimit = 0
  }

  // Start transaction
  try {
    const order = await prisma.$transaction(async (tx) => {
      let total = 0
      const now = new Date()

      // Verify stock, calculate total, and prepare items
      const orderItemsData = []
      
      // First pass: calculate order total to check credit limit
      
      for (const item of items) {
        const product = await tx.product.findUnique({ 
          where: { id: item.productId },
          include: { segmentPrices: true }
        })
        if (!product) throw new Error(`Produit introuvable: ${item.productId}`)
        
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}`)
        }

        // Use segment-based pricing (segment is string from User.segment)
        let unitPrice = getPriceForSegment(product, segment)
        
        // Apply discount if applicable
        if (discountRate && discountRate > 0) {
          unitPrice = unitPrice * (1 - discountRate / 100)
        }
        
        // Get product cost (snapshot at order time)
        const costAtTime = product.cost || 0
        
        total += unitPrice * item.quantity
        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: unitPrice,
          costAtTime: costAtTime
        })
      }

      // F1: Calculate totalTTC for credit limit check (balance = encours TTC)
      const totalTTC = calculateInvoiceTotalTTC(total, vatRate)

      // Check credit limit BEFORE creating order or decrementing stock (F1: use totalTTC)
      // Rule: creditLimit <= 0 means NO CREDIT ALLOWED (block if orderTotal > 0)
      // F1: If creditLimit > 0, check if (balance + newInvoiceTotalTTC) > creditLimit
      if (userCreditLimit <= 0) {
        // No credit allowed - block any unpaid order
        if (totalTTC > 0) {
          throw new Error('Crédit non autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
        }
      } else {
        // Credit limit exists - check if order would exceed it (F1: use totalTTC)
        const newBalance = userBalance + totalTTC
        if (newBalance > userCreditLimit) {
          const available = Math.max(0, userCreditLimit - userBalance)
          throw new Error(
            `Plafond de crédit dépassé. Votre plafond est ${userCreditLimit.toFixed(2)} Dh, solde dû ${userBalance.toFixed(2)} Dh, commande TTC ${totalTTC.toFixed(2)} Dh. ` +
            `Crédit disponible: ${available.toFixed(2)} Dh.`
          )
        }
      }

      // Second pass: reserve stock and create movements
      for (const item of items) {
        const product = await tx.product.findUnique({ 
          where: { id: item.productId },
          include: { segmentPrices: true }
        })
        if (!product) throw new Error(`Produit introuvable: ${item.productId}`)
        
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}`)
        }

        // Reserve stock and create movement
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reference: `Commande`,
            createdBy: session.id as string
          }
        })
      }

      // Generate sequential order number (with fallback if GlobalSequence not available)
      let orderNumber: string | null = null
      try {
        orderNumber = await getNextOrderNumber(tx, now)
      } catch (error: any) {
        // If GlobalSequence table doesn't exist yet, use fallback format
        console.warn('Failed to generate sequential order number, using fallback:', error.message)
        // Fallback: use legacy format based on order ID (will be set after creation)
        orderNumber = null
      }

      // Calculate requiresAdminApproval based on admin settings
      const requiresAdminApproval = await calculateRequiresAdminApproval(orderItemsData, adminSettings)

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: session.id as string,
          orderNumber,
          total,
          status: 'CONFIRMED',
          requiresAdminApproval,
          items: {
            create: orderItemsData
          }
        },
        include: { items: true }
      })
      
      // If orderNumber is null, set a fallback (legacy format)
      if (!orderNumber) {
        const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
        const fallbackNumber = `CMD-${dateKey}-${newOrder.id.slice(-4).toUpperCase()}`
        await tx.order.update({
          where: { id: newOrder.id },
          data: { orderNumber: fallbackNumber }
        })
        orderNumber = fallbackNumber
      }
      
      // Update movement reference with Order ID
      // Note: We can't easily update the movements created above with the newOrder ID in a single pass 
      // unless we create them AFTER the order or use a connect. 
      // For now, "Commande" reference is okay, or we could update them here.
      // Better approach: Create movements after order so we can use order ID in reference.
      
      // Let's rely on the generic "Commande" reference or update logic later if needed.

      // NOTE: Invoice is NOT created here - it will be created when order status changes to DELIVERED
      // This ensures clients see delivery note (BL) first, then invoice after delivery

      // F1: IMPORTANT: Increment user balance by totalTTC (balance = encours TTC)
      // This is done at order creation to track credit limit, even before invoice is created
      await tx.user.update({
        where: { id: session.id as string },
        data: { balance: { increment: totalTTC } }
      })

      return newOrder
    })

    // Log audit: Order created
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      await logEntityCreation(
        'ORDER_CREATED',
        'ORDER',
        order.id,
        session as any,
        {
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
          requiresAdminApproval: order.requiresAdminApproval,
          itemsCount: order.items.length,
        }
      )
    } catch (auditError) {
      console.error('Failed to log order creation:', auditError)
    }

    // Send confirmation email (non-blocking)
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email')
      const user = await prisma.user.findUnique({
        where: { id: session.id as string },
        select: { name: true, companyName: true, email: true }
      })
      
      if (user?.email) {
        const orderWithItems = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                product: {
                  select: { name: true }
                }
              }
            }
          }
        })

        if (orderWithItems) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
          const orderLink = `${baseUrl}/portal/orders/${order.id}`

          await sendOrderConfirmationEmail({
            to: user.email,
            orderNumber: order.orderNumber || `CMD-${order.id.slice(-8)}`,
            orderDate: order.createdAt,
            total: order.total,
            items: orderWithItems.items.map(item => ({
              productName: item.product.name,
              quantity: item.quantity,
              price: item.priceAtTime,
            })),
            clientName: user.companyName || user.name,
            orderLink,
          })
        }
      }
    } catch (emailError) {
      // Log error but don't fail the order creation
      console.error('Error sending order confirmation email:', emailError)
    }

    // Revalidate pages that display orders
    revalidatePath('/portal/orders')
    revalidatePath('/admin/orders')
    revalidatePath('/magasinier/orders')

    return { success: true, orderId: order.id }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la commande' }
  }
}

/**
 * Update an order item quantity in a pending order
 * Only works if order status is CONFIRMED or PREPARED and not paid
 */
export async function updateOrderItemAction(orderId: string, orderItemId: string, newQuantity: number) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  if (newQuantity < 1) {
    return { error: 'La quantité doit être au moins 1' }
  }

  try {
    const { oldQuantity, quantityDiff } = await prisma.$transaction(async (tx) => {
      // Get order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // G1: Check if order is modifiable (centralized check)
      if (!canModifyOrder(order)) {
        throw new Error(ORDER_NOT_MODIFIABLE_ERROR)
      }

      // Find the order item
      const orderItem = order.items.find(item => item.id === orderItemId)
      if (!orderItem) {
        throw new Error('Ligne de commande introuvable')
      }

      const oldQuantity = orderItem.quantity
      const quantityDiff = newQuantity - oldQuantity

      if (quantityDiff === 0) {
        // No change needed
        return { oldQuantity, quantityDiff: 0 }
      }

      // Get product with current pricing
      const product = await tx.product.findUnique({
        where: { id: orderItem.productId },
        include: { segmentPrices: true }
      })

      if (!product) {
        throw new Error('Produit introuvable')
      }

      // Get user segment and discountRate
      const user = await tx.user.findUnique({
        where: { id: session.id },
        select: { segment: true, discountRate: true }
      })

      const segment = user?.segment || 'LABO'
      const discountRate = user?.discountRate ?? null

      // Calculate new price with current segment and discount
      let unitPrice = getPriceForSegment(product, segment as any)
      if (discountRate && discountRate > 0) {
        unitPrice = unitPrice * (1 - discountRate / 100)
      }

      const costAtTime = product.cost || 0

      // Check stock availability
      if (quantityDiff > 0) {
        // Increasing quantity - check stock
        if (product.stock < quantityDiff) {
          throw new Error(`Stock insuffisant. Disponible: ${product.stock}, demandé: ${quantityDiff}`)
        }

        // Reserve additional stock
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: quantityDiff } },
        })

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'OUT',
            quantity: quantityDiff,
            reference: `Modification commande ${orderId.slice(-6)}`,
            createdBy: session.id as string
          }
        })
      } else {
        // Decreasing quantity - release stock
        const releasedQuantity = Math.abs(quantityDiff)
        await tx.product.update({
          where: { id: product.id },
          data: { stock: { increment: releasedQuantity } },
        })

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: 'IN',
            quantity: releasedQuantity,
            reference: `Modification commande ${orderId.slice(-6)}`,
            createdBy: session.id as string
          }
        })
      }

      // Update order item
      await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          quantity: newQuantity,
          priceAtTime: unitPrice, // Update with current price
          costAtTime: costAtTime
        }
      })

      // Recalculate order total
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: orderId }
      })

      const newTotal = updatedItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

      // Update order total
      await tx.order.update({
        where: { id: orderId },
        data: { total: newTotal }
      })

      // SECURITY: Block invoice modification if invoice is locked (once emitted, invoice cannot be modified)
      if (order.invoice && !canModifyInvoiceAmount(order.invoice)) {
        throw new Error(INVOICE_LOCKED_ERROR)
      }

      // Update invoice amount and balance (only if invoice is not locked)
      if (order.invoice) {
        const paidAmount = order.invoice.amount - order.invoice.balance
        const newBalance = newTotal - paidAmount

        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            amount: newTotal,
            balance: Math.max(0, newBalance), // Balance can't be negative
            status: newBalance <= 0.01 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
          }
        })
      }

      return { oldQuantity, quantityDiff }
    })

    // Log audit: Order item updated (oldQuantity et quantityDiff viennent du retour de la transaction)
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true }
      })
      await logEntityUpdate(
        'ORDER_UPDATED',
        'ORDER',
        orderId,
        session as any,
        {
          orderItemId,
          oldQuantity,
          newQuantity,
          quantityDiff
        },
        {
          orderNumber: updatedOrder?.orderNumber,
          newTotal: updatedOrder?.total
        }
      )
    } catch (auditError) {
      console.error('Failed to log order update:', auditError)
    }

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la modification' }
  }
}

/**
 * Update multiple order items at once in a pending order
 * Only works if order status is CONFIRMED or PREPARED and not paid
 */
export async function updateOrderItemsAction(
  orderId: string,
  items: { orderItemId: string; newQuantity: number }[]
) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  // Get admin settings once (outside transaction for better performance)
  let adminSettings
  try {
    adminSettings = await prisma.adminSettings.findUnique({
      where: { id: 'default' }
    })
  } catch (error) {
    console.warn('AdminSettings table not available, using defaults')
    adminSettings = null
  }

  if (items.length === 0) {
    return { error: 'Aucune modification à effectuer' }
  }

  // Validate all quantities
  for (const item of items) {
    if (item.newQuantity < 1) {
      return { error: 'La quantité doit être au moins 1' }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Get order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                include: { segmentPrices: true }
              }
            }
          },
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // G1: Check if order is modifiable (centralized check)
      if (!canModifyOrder(order)) {
        throw new Error(ORDER_NOT_MODIFIABLE_ERROR)
      }

      // Get user segment and discountRate
      const user = await tx.user.findUnique({
        where: { id: session.id },
        select: { segment: true, discountRate: true }
      })

      const segment = user?.segment || 'LABO'
      const discountRate = user?.discountRate ?? null

      // Process each item update
      for (const itemUpdate of items) {
        const orderItem = order.items.find(item => item.id === itemUpdate.orderItemId)
        if (!orderItem) {
          throw new Error(`Ligne de commande introuvable: ${itemUpdate.orderItemId}`)
        }

        const quantityDiff = itemUpdate.newQuantity - orderItem.quantity

        if (quantityDiff === 0) {
          // No change needed for this item
          continue
        }

        const product = orderItem.product

        // Calculate new price with current segment and discount
        let unitPrice = getPriceForSegment(product, segment as any)
        if (discountRate && discountRate > 0) {
          unitPrice = unitPrice * (1 - discountRate / 100)
        }

        const costAtTime = product.cost || 0

        // Check stock availability
        if (quantityDiff > 0) {
          // Increasing quantity - check stock
          if (product.stock < quantityDiff) {
            throw new Error(`Stock insuffisant pour ${product.name}. Disponible: ${product.stock}, demandé: ${quantityDiff}`)
          }

          // Reserve additional stock
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: quantityDiff } },
          })

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: 'OUT',
              quantity: quantityDiff,
              reference: `Modification commande ${orderId.slice(-6)}`,
              createdBy: session.id as string
            }
          })
        } else {
          // Decreasing quantity - release stock
          const releasedQuantity = Math.abs(quantityDiff)
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { increment: releasedQuantity } },
          })

          // Create stock movement
          await tx.stockMovement.create({
            data: {
              productId: product.id,
              type: 'IN',
              quantity: releasedQuantity,
              reference: `Modification commande ${orderId.slice(-6)}`,
              createdBy: session.id as string
            }
          })
        }

        // Update order item
        await tx.orderItem.update({
          where: { id: itemUpdate.orderItemId },
          data: {
            quantity: itemUpdate.newQuantity,
            priceAtTime: unitPrice, // Update with current price
            costAtTime: costAtTime
          }
        })
      }

      // Recalculate order total
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: orderId }
      })

      const newTotal = updatedItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

      // Calculate requiresAdminApproval based on admin settings
      const requiresAdminApproval = await calculateRequiresAdminApproval(
        updatedItems.map(item => ({
          priceAtTime: item.priceAtTime,
          costAtTime: item.costAtTime,
          quantity: item.quantity
        })),
        adminSettings
      )

      // Update order total and requiresAdminApproval
      await tx.order.update({
        where: { id: orderId },
        data: { 
          total: newTotal,
          requiresAdminApproval
        }
      })

      // SECURITY: Block invoice modification if invoice is locked (once emitted, invoice cannot be modified)
      if (order.invoice && !canModifyInvoiceAmount(order.invoice)) {
        throw new Error(INVOICE_LOCKED_ERROR)
      }

      // Update invoice amount and balance (only if invoice is not locked)
      if (order.invoice) {
        const paidAmount = order.invoice.amount - order.invoice.balance
        const newBalance = newTotal - paidAmount

        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            amount: newTotal,
            balance: Math.max(0, newBalance), // Balance can't be negative
            status: newBalance <= 0.01 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
          }
        })
      }
    })

    // Log audit: Multiple order items updated
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true }
      })
      const itemsUpdated = items.map(item => ({
        orderItemId: item.orderItemId,
        newQuantity: item.newQuantity
      }))
      await logEntityUpdate(
        'ORDER_UPDATED',
        'ORDER',
        orderId,
        session as any,
        {
          itemsCount: items.length,
          itemsUpdated
        },
        {
          orderNumber: updatedOrder?.orderNumber,
          newTotal: updatedOrder?.total
        }
      )
    } catch (auditError) {
      console.error('Failed to log order update:', auditError)
    }

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la modification' }
  }
}

/**
 * Add new items to an existing order
 * Only works if order status is CONFIRMED or PREPARED and not paid
 */
export async function addItemsToOrderAction(
  orderId: string,
  items: { productId: string; quantity: number }[]
) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  if (items.length === 0) {
    return { error: 'Aucun article à ajouter' }
  }

  // Validate all quantities
  for (const item of items) {
    if (item.quantity < 1) {
      return { error: 'La quantité doit être au moins 1' }
    }
  }

  try {
    const newItemsTotal = await prisma.$transaction(async (tx) => {
      // Get order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // G1: Check if order is modifiable (centralized check)
      if (!canModifyOrder(order)) {
        throw new Error(ORDER_NOT_MODIFIABLE_ERROR)
      }

      // Get user segment and discountRate
      const user = await tx.user.findUnique({
        where: { id: session.id },
        select: { segment: true, discountRate: true, balance: true, creditLimit: true }
      })

      const segment = user?.segment || 'LABO'
      const discountRate = user?.discountRate ?? null
      const userBalance = user?.balance ?? 0
      const userCreditLimit = (user as any)?.creditLimit ?? 0

      // Calculate total for new items and check stock
      let itemsTotal = 0
      const orderItemsData = []

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { segmentPrices: true }
        })

        if (!product) {
          throw new Error(`Produit introuvable: ${item.productId}`)
        }

        // Check stock
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`)
        }

        // Calculate price with current segment and discount
        let unitPrice = getPriceForSegment(product, segment as any)
        if (discountRate && discountRate > 0) {
          unitPrice = unitPrice * (1 - discountRate / 100)
        }

        const costAtTime = product.cost || 0
        itemsTotal += unitPrice * item.quantity

        orderItemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: unitPrice,
          costAtTime: costAtTime
        })
      }

      // Check credit limit BEFORE adding items
      if (userCreditLimit <= 0) {
        if (itemsTotal > 0) {
          throw new Error('Crédit non autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
        }
      } else {
        const currentOrderTotal = order.total
        const newOrderTotal = currentOrderTotal + itemsTotal
        const newBalance = userBalance + itemsTotal

        if (newBalance > userCreditLimit) {
          const available = Math.max(0, userCreditLimit - userBalance)
          throw new Error(
            `Plafond de crédit dépassé. Votre plafond est ${userCreditLimit.toFixed(2)} Dh, solde dû ${userBalance.toFixed(2)} Dh, nouveaux articles ${itemsTotal.toFixed(2)} Dh. ` +
            `Crédit disponible: ${available.toFixed(2)} Dh. Veuillez contacter la société.`
          )
        }
      }

      // Reserve stock and create movements for new items
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reference: `Commande ${orderId.slice(-6)}`,
            createdBy: session.id as string
          }
        })
      }

      // Create or update order items
      for (const itemData of orderItemsData) {
        // Check if product already exists in order
        const existingItem = order.items.find(i => i.productId === itemData.productId)
        
        if (existingItem) {
          // Increment quantity of existing item
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: { 
              quantity: { increment: itemData.quantity }
            }
          })
        } else {
          // Create new order item
          await tx.orderItem.create({
            data: {
              orderId: orderId,
              productId: itemData.productId,
              quantity: itemData.quantity,
              priceAtTime: itemData.priceAtTime,
              costAtTime: itemData.costAtTime
            }
          })
        }
      }

      // Recalculate order total
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: orderId }
      })

      const newTotal = updatedItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

      // Update order total
      await tx.order.update({
        where: { id: orderId },
        data: { total: newTotal }
      })

      // Update user balance (increment by new items total)
      await tx.user.update({
        where: { id: session.id as string },
        data: { balance: { increment: itemsTotal } }
      })

      // SECURITY: Block invoice modification if invoice is locked (once emitted, invoice cannot be modified)
      if (order.invoice && !canModifyInvoiceAmount(order.invoice)) {
        throw new Error(INVOICE_LOCKED_ERROR)
      }

      // Update invoice amount and balance (only if invoice is not locked)
      if (order.invoice) {
        const paidAmount = order.invoice.amount - order.invoice.balance
        const newBalance = newTotal - paidAmount

        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            amount: newTotal,
            balance: Math.max(0, newBalance),
            status: newBalance <= 0.01 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
          }
        })
      }

      return itemsTotal
    })

    // Log audit: Items added to order (newItemsTotal = retour de la transaction)
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true }
      })
      await logEntityCreation(
        'ORDER_ITEM_ADDED',
        'ORDER',
        orderId,
        session as any,
        {
          orderNumber: updatedOrder?.orderNumber,
          itemsAdded: items.length,
          itemsTotal: newItemsTotal,
          newOrderTotal: updatedOrder?.total
        }
      )
    } catch (auditError) {
      console.error('Failed to log items addition:', auditError)
    }

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'ajout des articles' }
  }
}

/**
 * Add a single item to an existing order
 * If the product already exists in the order, increment its quantity
 * Only works if order status is CONFIRMED or PREPARED and not paid
 */
export async function addOrderItemAction(
  orderId: string,
  productId: string,
  quantity: number
) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  // Get admin settings once (outside transaction for better performance)
  let adminSettings
  try {
    adminSettings = await prisma.adminSettings.findUnique({
      where: { id: 'default' }
    })
  } catch (error) {
    console.warn('AdminSettings table not available, using defaults')
    adminSettings = null
  }

  if (quantity < 1) {
    return { error: 'La quantité doit être au moins 1' }
  }

  try {
    const newItemsTotal = await prisma.$transaction(async (tx) => {
      // Get order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // G1: Check if order is modifiable (centralized check)
      if (!canModifyOrder(order)) {
        throw new Error(ORDER_NOT_MODIFIABLE_ERROR)
      }

      // Get product
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { segmentPrices: true }
      })

      if (!product) {
        throw new Error('Produit introuvable')
      }

      // Check stock
      if (product.stock < quantity) {
        throw new Error(`Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`)
      }

      // Get user segment, discountRate, balance, and creditLimit
      const user = await tx.user.findUnique({
        where: { id: session.id },
        select: { segment: true, discountRate: true, balance: true, creditLimit: true }
      })

      const segment = user?.segment || 'LABO'
      const discountRate = user?.discountRate ?? null
      const userBalance = user?.balance ?? 0
      const userCreditLimit = (user as any)?.creditLimit ?? 0

      // Calculate price with current segment and discount
      let unitPrice = getPriceForSegment(product, segment as any)
      if (discountRate && discountRate > 0) {
        unitPrice = unitPrice * (1 - discountRate / 100)
      }

      const costAtTime = product.cost || 0
      const itemsTotal = unitPrice * quantity

      // Check credit limit BEFORE adding item
      if (userCreditLimit <= 0) {
        if (itemsTotal > 0) {
          throw new Error('Crédit non autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
        }
      } else {
        const currentOrderTotal = order.total
        const newOrderTotal = currentOrderTotal + itemsTotal
        const newBalance = userBalance + itemsTotal

        if (newBalance > userCreditLimit) {
          const available = Math.max(0, userCreditLimit - userBalance)
          throw new Error(
            `Plafond de crédit dépassé. Votre plafond est ${userCreditLimit.toFixed(2)} Dh, solde dû ${userBalance.toFixed(2)} Dh, nouveaux articles ${itemsTotal.toFixed(2)} Dh. ` +
            `Crédit disponible: ${available.toFixed(2)} Dh. Veuillez contacter la société.`
          )
        }
      }

      // Check if product already exists in order
      const existingItem = order.items.find(i => i.productId === productId)

      if (existingItem) {
        // Increment quantity of existing item
        // Note: We keep the original priceAtTime, but this is a design decision
        // If you want to update priceAtTime to current price, uncomment the priceAtTime line
        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: { 
            quantity: { increment: quantity }
            // priceAtTime: unitPrice // Uncomment to update price to current price
          }
        })
      } else {
        // Create new order item
        await tx.orderItem.create({
          data: {
            orderId: orderId,
            productId: productId,
            quantity: quantity,
            priceAtTime: unitPrice,
            costAtTime: costAtTime
          }
        })
      }

      // Reserve stock
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      })

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          productId: productId,
          type: 'OUT',
          quantity: quantity,
          reference: `Commande ${orderId.slice(-6)}`,
          createdBy: session.id as string
        }
      })

      // Recalculate order total
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: orderId }
      })

      const newTotal = updatedItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

      // Calculate requiresAdminApproval based on admin settings
      const requiresAdminApproval = await calculateRequiresAdminApproval(
        updatedItems.map(item => ({
          priceAtTime: item.priceAtTime,
          costAtTime: item.costAtTime,
          quantity: item.quantity
        })),
        adminSettings
      )

      // Update order total and requiresAdminApproval
      await tx.order.update({
        where: { id: orderId },
        data: { 
          total: newTotal,
          requiresAdminApproval
        }
      })

      // Update user balance (increment by new items total)
      await tx.user.update({
        where: { id: session.id as string },
        data: { balance: { increment: itemsTotal } }
      })

      // SECURITY: Block invoice modification if invoice is locked (once emitted, invoice cannot be modified)
      if (order.invoice && !canModifyInvoiceAmount(order.invoice)) {
        throw new Error(INVOICE_LOCKED_ERROR)
      }

      // Update invoice amount and balance (only if invoice is not locked)
      if (order.invoice) {
        const paidAmount = order.invoice.amount - order.invoice.balance
        const newBalance = newTotal - paidAmount

        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            amount: newTotal,
            balance: Math.max(0, newBalance),
            status: newBalance <= 0.01 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
          }
        })
      }

      return itemsTotal
    })

    // Log audit: Item added to order (newItemsTotal = retour de la transaction)
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true }
      })
      await logEntityCreation(
        'ORDER_ITEM_ADDED',
        'ORDER',
        orderId,
        session as any,
        {
          orderNumber: updatedOrder?.orderNumber,
          productId,
          quantity,
          itemsTotal: newItemsTotal,
          newOrderTotal: updatedOrder?.total
        }
      )
    } catch (auditError) {
      console.error('Failed to log item addition:', auditError)
    }

    revalidatePath('/portal/orders')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'ajout de l\'article' }
  }
}

/**
 * Add multiple product lines to an existing order
 * Only works if order status is CONFIRMED (not PREPARED) and not paid
 */
export async function addOrderLinesAction(
  orderId: string,
  lines: { productId: string; quantity: number }[]
) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  // Get admin settings once (outside transaction for better performance)
  let adminSettings
  try {
    adminSettings = await prisma.adminSettings.findUnique({
      where: { id: 'default' }
    })
  } catch (error) {
    console.warn('AdminSettings table not available, using defaults')
    adminSettings = null
  }

  if (lines.length === 0) {
    return { error: 'Aucun article à ajouter' }
  }

  // Validate all quantities
  for (const line of lines) {
    if (!line.productId || line.quantity < 1 || !Number.isInteger(line.quantity)) {
      return { error: 'Chaque ligne doit avoir un produit valide et une quantité entière >= 1' }
    }
  }

  try {
    const newItemsTotal = await prisma.$transaction(async (tx) => {
      // Get order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // Check if order is editable (CONFIRMED only, not PREPARED)
      if (order.status !== 'CONFIRMED') {
        throw new Error('Seules les commandes confirmées peuvent recevoir de nouveaux articles')
      }

      if (order.invoice?.status === 'PAID') {
        throw new Error('Cette commande ne peut pas être modifiée car elle est déjà payée')
      }

      // Get user segment, discountRate, balance, and creditLimit
      const user = await tx.user.findUnique({
        where: { id: session.id },
        select: { segment: true, discountRate: true, balance: true, creditLimit: true }
      })

      const segment = user?.segment || 'LABO'
      const discountRate = user?.discountRate ?? null
      const userBalance = user?.balance ?? 0
      const userCreditLimit = (user as any)?.creditLimit ?? 0

      // Calculate total for new items, check stock, and prepare items
      let itemsTotal = 0
      const itemsToAdd: Array<{
        productId: string
        quantity: number
        priceAtTime: number
        costAtTime: number
      }> = []

      for (const line of lines) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          include: { segmentPrices: true }
        })

        if (!product) {
          throw new Error(`Produit introuvable: ${line.productId}`)
        }

        // Check stock
        if (product.stock < line.quantity) {
          throw new Error(`Stock insuffisant pour ${product.name}. Disponible: ${product.stock}, demandé: ${line.quantity}`)
        }

        // Calculate price with current segment and discount
        let unitPrice = getPriceForSegment(product, segment as any)
        if (discountRate && discountRate > 0) {
          unitPrice = unitPrice * (1 - discountRate / 100)
        }

        const costAtTime = product.cost || 0
        const lineTotal = unitPrice * line.quantity
        itemsTotal += lineTotal

        itemsToAdd.push({
          productId: line.productId,
          quantity: line.quantity,
          priceAtTime: unitPrice,
          costAtTime: costAtTime
        })
      }

      // Check credit limit BEFORE adding items
      if (userCreditLimit <= 0) {
        if (itemsTotal > 0) {
          throw new Error('Crédit non autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
        }
      } else {
        const currentOrderTotal = order.total
        const newOrderTotal = currentOrderTotal + itemsTotal
        const newBalance = userBalance + itemsTotal

        if (newBalance > userCreditLimit) {
          const available = Math.max(0, userCreditLimit - userBalance)
          throw new Error(
            `Plafond de crédit dépassé. Votre plafond est ${userCreditLimit.toFixed(2)} Dh, solde dû ${userBalance.toFixed(2)} Dh, nouveaux articles ${itemsTotal.toFixed(2)} Dh. ` +
            `Crédit disponible: ${available.toFixed(2)} Dh. Veuillez contacter la société.`
          )
        }
      }

      // Process each line: increment if exists, create if new
      for (const itemToAdd of itemsToAdd) {
        const existingItem = order.items.find(i => i.productId === itemToAdd.productId)

        if (existingItem) {
          // Increment quantity of existing item
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: { 
              quantity: { increment: itemToAdd.quantity }
            }
          })
        } else {
          // Create new order item
          await tx.orderItem.create({
            data: {
              orderId: orderId,
              productId: itemToAdd.productId,
              quantity: itemToAdd.quantity,
              priceAtTime: itemToAdd.priceAtTime,
              costAtTime: itemToAdd.costAtTime
            }
          })
        }

        // Reserve stock
        await tx.product.update({
          where: { id: itemToAdd.productId },
          data: { stock: { decrement: itemToAdd.quantity } },
        })

        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: itemToAdd.productId,
            type: 'OUT',
            quantity: itemToAdd.quantity,
            reference: `Commande ${orderId.slice(-6)}`,
            createdBy: session.id as string
          }
        })
      }

      // Recalculate order total
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: orderId }
      })

      const newTotal = updatedItems.reduce((sum, item) => sum + (item.priceAtTime * item.quantity), 0)

      // Calculate requiresAdminApproval based on admin settings
      const requiresAdminApproval = await calculateRequiresAdminApproval(
        updatedItems.map(item => ({
          priceAtTime: item.priceAtTime,
          costAtTime: item.costAtTime,
          quantity: item.quantity
        })),
        adminSettings
      )

      // Update order total and requiresAdminApproval
      await tx.order.update({
        where: { id: orderId },
        data: { 
          total: newTotal,
          requiresAdminApproval
        }
      })

      // Update user balance (increment by new items total)
      await tx.user.update({
        where: { id: session.id as string },
        data: { balance: { increment: itemsTotal } }
      })

      // SECURITY: Block invoice modification if invoice is locked (once emitted, invoice cannot be modified)
      if (order.invoice && !canModifyInvoiceAmount(order.invoice)) {
        throw new Error(INVOICE_LOCKED_ERROR)
      }

      // Update invoice amount and balance (only if invoice is not locked)
      if (order.invoice) {
        const paidAmount = order.invoice.amount - order.invoice.balance
        const newBalance = newTotal - paidAmount

        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            amount: newTotal,
            balance: Math.max(0, newBalance),
            status: newBalance <= 0.01 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')
          }
        })
      }

      return itemsTotal
    })

    // Log audit: Lines added to order (newItemsTotal = retour de la transaction)
    try {
      const { logEntityCreation } = await import('@/lib/audit')
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        select: { orderNumber: true, total: true }
      })
      await logEntityCreation(
        'ORDER_ITEM_ADDED',
        'ORDER',
        orderId,
        session as any,
        {
          orderNumber: updatedOrder?.orderNumber,
          linesAdded: lines.length,
          itemsTotal: newItemsTotal,
          newOrderTotal: updatedOrder?.total
        }
      )
    } catch (auditError) {
      console.error('Failed to log lines addition:', auditError)
    }

    revalidatePath('/portal/orders')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'ajout des articles' }
  }
}

export async function cancelOrderAction(orderId: string) {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  try {
    const order = await prisma.$transaction(async (tx) => {
      // Fetch order with items and invoice
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          invoice: true
        }
      })

      if (!order) {
        throw new Error('Commande introuvable')
      }

      // Check if order belongs to user
      if (order.userId !== session.id) {
        throw new Error('Non autorisé')
      }

      // Check if order is cancellable
      // Rule: Can cancel if status is CONFIRMED or PREPARED, and not already paid
      const isCancellable = 
        (order.status === 'CONFIRMED' || order.status === 'PREPARED') &&
        order.invoice?.status !== 'PAID'

      if (!isCancellable) {
        throw new Error('Cette commande ne peut pas être annulée')
      }

      // Release stock for each item
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })

        // Create stock movement to record the return
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            reference: `Annulation commande ${orderId.slice(-6)}`,
            createdBy: session.id as string
          }
        })
      }

      // IMPORTANT: Reduce user.balance by order.total (because order creation incremented it)
      // This ensures the credit limit calculation is correct after cancellation
      await tx.user.update({
        where: { id: order.userId },
        data: {
          balance: {
            decrement: order.total
          }
        }
      })

      // Update invoice status if it exists and is not paid
      // Note: If invoice has partial payments, we keep them but mark as CANCELLED
      if (order.invoice && order.invoice.status !== 'PAID') {
        await tx.invoice.update({
          where: { id: order.invoice.id },
          data: {
            status: 'CANCELLED',
            balance: 0 // Reset balance since order is cancelled
          }
        })
      }

      // Update order status to CANCELLED
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      })

      return order
    })

    // Log audit: Order cancelled
    try {
      const { logStatusChange } = await import('@/lib/audit')
      await logStatusChange(
        'ORDER_CANCELLED',
        'ORDER',
        orderId,
        order.status,
        'CANCELLED',
        session as any,
        {
          orderNumber: order.orderNumber,
          total: order.total,
          itemsCount: order.items.length
        }
      )
    } catch (auditError) {
      console.error('Failed to log order cancellation:', auditError)
    }

    // Revalidate pages that display orders
    revalidatePath('/portal/orders')
    revalidatePath('/admin/orders')
    revalidatePath(`/admin/orders/${orderId}`)
    revalidatePath('/magasinier/orders')
    revalidatePath(`/magasinier/orders/${orderId}`)

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de l\'annulation' }
  }
}
