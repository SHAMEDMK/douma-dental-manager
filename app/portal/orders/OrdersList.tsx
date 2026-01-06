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
  deliveryCity?: string | null
  deliveryAddress?: string | null
  deliveryPhone?: string | null
  deliveryNote?: string | null
  shippedAt?: Date | null
  deliveredAt?: Date | null
  deliveryAgentName?: string | null
  deliveredToName?: string | null
  deliveryProofNote?: string | null
  items: OrderItem[]
  invoice?: {
    id: string
    status: string
    amount: number
    totalPaid: number
    remaining: number
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
    
    const isModifiable = (order.status === 'CONFIRMED' || order.status === 'PREPARED') && order.invoice?.status !== 'PAID'
    
    // If not modifiable, don't allow expansion
    if (!isModifiable) return
    
    // Toggle: if clicking the same order, close it; otherwise open the new one
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId)
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => {
        const isModifiable = (order.status === 'CONFIRMED' || order.status === 'PREPARED') && order.invoice?.status !== 'PAID'
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
            invoiceStatus={order.invoice?.status}
            invoiceId={order.invoice?.id}
            invoiceAmount={order.invoice?.amount}
            invoiceTotalPaid={order.invoice?.totalPaid}
            invoiceRemaining={order.invoice?.remaining}
            deliveryCity={order.deliveryCity}
            deliveryAddress={order.deliveryAddress}
            deliveryPhone={order.deliveryPhone}
            deliveryNote={order.deliveryNote}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
            deliveryAgentName={order.deliveryAgentName}
            deliveredToName={order.deliveredToName}
            deliveryProofNote={order.deliveryProofNote}
            isExpanded={isExpanded}
            isModifiable={isModifiable}
            onToggle={() => handleToggleOrder(order.id)}
          />
        )
      })}
    </div>
  )
}

