import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import OrdersList from './OrdersList'
import { formatOrderNumber } from '../../lib/orderNumber'
import { calculateTotalPaid } from '../../lib/invoice-utils'

export default async function OrdersPage() {
  const session = await getSession()
  const orders = await prisma.order.findMany({
    where: { userId: session?.id },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      total: true,
      deliveryCity: true,
      deliveryAddress: true,
      deliveryPhone: true,
      deliveryNote: true,
      shippedAt: true,
      deliveredAt: true,
      deliveryAgentName: true,
      deliveredToName: true,
      deliveryProofNote: true,
      items: {
        include: { 
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true
            }
          }
        }
      },
      invoice: {
        select: {
          id: true,
          status: true,
          amount: true,
          payments: {
            select: {
              amount: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  const formattedOrders = orders.map(order => ({
    id: order.id,
    orderNumber: formatOrderNumber(order.orderNumber, order.id, order.createdAt),
    createdAt: order.createdAt,
    status: order.status,
    total: order.total,
    deliveryCity: order.deliveryCity,
    deliveryAddress: order.deliveryAddress,
    deliveryPhone: order.deliveryPhone,
    deliveryNote: order.deliveryNote,
    shippedAt: order.shippedAt,
    deliveredAt: order.deliveredAt,
    deliveryAgentName: order.deliveryAgentName,
    deliveredToName: order.deliveredToName,
    deliveryProofNote: order.deliveryProofNote,
    items: order.items.map(i => ({
      id: i.id,
      quantity: i.quantity,
      priceAtTime: i.priceAtTime,
      product: {
        id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        stock: i.product.stock
      }
    })),
    invoice: order.invoice ? {
      id: order.invoice.id,
      status: order.invoice.status,
      amount: order.invoice.amount,
      totalPaid: calculateTotalPaid(order.invoice.payments),
      remaining: order.invoice.amount - calculateTotalPaid(order.invoice.payments)
    } : undefined
  }))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mes Commandes</h1>
      <OrdersList orders={formattedOrders} />
    </div>
  )
}
