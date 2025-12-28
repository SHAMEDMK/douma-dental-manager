'use client'

import { useCart } from '../CartContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Plus, Minus } from 'lucide-react'

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

type OrderItemCardProps = {
  item: OrderItem
  isOrderPaid: boolean
}

export default function OrderItemCard({ item, isOrderPaid }: OrderItemCardProps) {
  const { addToCart } = useCart()
  const router = useRouter()
  
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxQuantity = item.product.stock > 0 ? item.product.stock : 1
  const isOutOfStock = item.product.stock <= 0

  const handleQuantityChange = (newQty: number) => {
    const clamped = Math.max(1, Math.min(newQty, maxQuantity))
    setQuantity(clamped)
    setError(null)
  }

  const handleReorder = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (isOutOfStock) {
      setError('Produit en rupture de stock')
      return
    }

    if (quantity > item.product.stock) {
      setError(`Stock insuffisant. Disponible: ${item.product.stock}`)
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      if (!addToCart || typeof addToCart !== 'function') {
        throw new Error('addToCart is not a function')
      }
      
      // Add the product with current price (not historical priceAtTime)
      addToCart({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        stock: item.product.stock
      }, quantity)
      
      // Redirect to cart immediately
      router.push('/portal/cart')
    } catch (err) {
      setError('Erreur lors de la recommandation')
      setIsAdding(false)
    }
  }

  return (
    <div className="flex justify-end">
      <div className="flex flex-col items-end gap-2">
          {isOrderPaid ? (
            <span className="text-xs text-gray-500 px-3 py-1.5">
              Commande payée
            </span>
          ) : isOutOfStock ? (
            <span className="text-xs text-red-600 px-3 py-1.5 font-medium">
              Rupture
            </span>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Quantité:</label>
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1 || isAdding}
                    className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Diminuer la quantité"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={maxQuantity}
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                    disabled={isAdding}
                    className="w-12 text-center text-sm border-0 focus:ring-0 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= maxQuantity || isAdding}
                    className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReorder}
                disabled={isAdding || isOutOfStock}
                className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-all duration-200 ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isAdding
                    ? 'bg-blue-300 text-white cursor-wait'
                    : 'bg-blue-900 text-white hover:bg-blue-800'
                }`}
                title={isOutOfStock ? 'Produit en rupture de stock' : 'Recommander ce produit'}
              >
                {isAdding ? (
                  <>
                    <span className="animate-pulse">...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5" />
                    <span>Recommander</span>
                  </>
                )}
              </button>
            </>
          )}
          {error && (
            <div className="text-xs text-red-700 bg-red-100 border border-red-300 px-3 py-2 rounded-md shadow-sm max-w-xs text-center font-medium">
              {error}
            </div>
          )}
        </div>
    </div>
  )
}

