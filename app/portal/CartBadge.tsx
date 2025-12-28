'use client'

import { useCart } from './CartContext'

export default function CartBadge() {
  const { items } = useCart()
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (itemCount === 0) return null

  return (
    <span className="absolute -top-1 -right-1 bg-blue-900 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
      {itemCount > 99 ? '99+' : itemCount}
    </span>
  )
}

