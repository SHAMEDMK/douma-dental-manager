'use client'

import { useState } from 'react'
import OrderCard from './OrderCard'

type OrderItem = {
  id: string
  quantity: number
  priceAtTime: number
  product: {
    id: string
    name: string
    sku?: string | null
    price: number
    stock: number
  }
}

type Order = {
  id: string
  orderNumber: string
  createdAt: Date
  status: string
  total: number
  totalTTC?: number
  deliveryCity?: string | null
  deliveryAddress?: string | null
  deliveryPhone?: string | null
  deliveryNote?: string | null
  deliveryNoteNumber?: string | null
  shippedAt?: Date | null
  deliveredAt?: Date | null
  deliveryAgentName?: string | null
  deliveredToName?: string | null
  deliveryProofNote?: string | null
  deliveryConfirmationCode?: string | null
  discountRate?: number | null
  items: OrderItem[]
  invoice?: {
    id: string
    status: string
    amount: number
    totalPaid: number
    remaining: number
    createdAt: Date
  }
}

type OrdersListProps = {
  orders: Order[]
}

export default function OrdersList({ orders }: OrdersListProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  const handleToggleOrder = (orderId: string) => {
    // Only allow expansion for modifiable orders
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    
    // Check if invoice is locked (once created, invoice cannot be modified)
    const isInvoiceLocked = order.invoice?.createdAt !== null && order.invoice?.createdAt !== undefined
    const isModifiable = (order.status === 'CONFIRMED' || order.status === 'PREPARED') && 
                         order.invoice?.status !== 'PAID' && 
                         !isInvoiceLocked
    
    // If not modifiable, don't allow expansion
    if (!isModifiable) return
    
    // Toggle: if clicking the same order, close it; otherwise open the new one
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => {
        // Check if invoice is locked (once created, invoice cannot be modified)
        const isInvoiceLocked = order.invoice?.createdAt !== null && order.invoice?.createdAt !== undefined
        // Règle G1: Commande modifiable = status === 'CONFIRMED' ET invoice non payée ET facture non verrouillée
        const isModifiable = order.status === 'CONFIRMED' && 
                             order.invoice?.status !== 'PAID' && 
                             !isInvoiceLocked
        const isExpanded = expandedOrderId === order.id && isModifiable
        
        return (
          <OrderCard
            key={order.id}
            orderId={order.id}
            items={order.items}
            orderStatus={order.status}
            isOrderPaid={order.invoice?.status === 'PAID'}
            orderNumber={order.orderNumber}
            createdAt={order.createdAt}
            total={order.total}
            totalTTC={order.totalTTC}
            invoiceStatus={order.invoice?.status}
            invoiceId={order.invoice?.id}
            invoiceAmount={order.invoice?.amount}
            invoiceTotalPaid={order.invoice?.totalPaid}
            invoiceRemaining={order.invoice?.remaining}
            isInvoiceLocked={isInvoiceLocked}
            deliveryCity={order.deliveryCity}
            deliveryAddress={order.deliveryAddress}
            deliveryPhone={order.deliveryPhone}
            deliveryNote={order.deliveryNote}
            deliveryNoteNumber={order.deliveryNoteNumber}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
            deliveryAgentName={order.deliveryAgentName}
            deliveredToName={order.deliveredToName}
            deliveryProofNote={order.deliveryProofNote}
            deliveryConfirmationCode={order.deliveryConfirmationCode}
            discountRate={order.discountRate}
            isExpanded={isExpanded}
            isModifiable={isModifiable}
            onToggle={() => handleToggleOrder(order.id)}
          />
        )
      })}
    </div>
  )
}

