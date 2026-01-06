'use client'

import { useRouter } from 'next/navigation'
import { ShoppingCart } from 'lucide-react'

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

type ReorderAllButtonProps = {
  items: OrderItem[]
  orderNumber: string
}

export default function ReorderAllButton({ items, orderNumber }: ReorderAllButtonProps) {
  const router = useRouter()

  const handleNewOrder = () => {
    // Redirect to catalog to create a new order
    router.push('/portal')
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleNewOrder}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 bg-blue-900 text-white hover:bg-blue-800"
        title="Aller au catalogue pour créer une nouvelle commande"
      >
        <ShoppingCart className="h-4 w-4" />
        <span>Nouvelle commande</span>
      </button>
    </div>
  )
}

