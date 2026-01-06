'use client'

import { ShoppingCart } from 'lucide-react'
import { useCart } from '../CartContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'
import { getUserCreditInfo } from '@/app/actions/user'

export default function ProductCard({ product }: { product: any }) {
  const { addToCart, items, total } = useCart()
  const router = useRouter()
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState('')
  const [creditInfo, setCreditInfo] = useState<{ balance: number; creditLimit: number; available: number } | null>(null)
  const [isCheckingCredit, setIsCheckingCredit] = useState(false)

  // Fetch user credit info
  useEffect(() => {
    getUserCreditInfo().then((result) => {
      if (result && 'balance' in result && !('error' in result && result.error)) {
        setCreditInfo(result as { balance: number; creditLimit: number; available: number })
      }
    }).catch(() => {
      // Silently fail
    })
  }, [])

  const maxQuantity = product.stock > 0 ? product.stock : 1
  const isOutOfStock = product.stock <= 0

  // Check if adding this product would exceed credit limit
  // Only block if creditInfo is loaded AND it would exceed the limit
  // If creditInfo is not loaded yet, allow (will be validated server-side)
  const wouldExceedCreditLimit = (() => {
    // If creditInfo not loaded yet, don't block (allow adding to cart)
    if (!creditInfo) return false
    
    // Calculate new total if we add this product
    const productTotal = product.price * quantity
    const newTotal = total + productTotal
    
    // If creditLimit is 0 or null/undefined, no credit is allowed
    // But we should still allow adding to cart - validation happens at checkout
    if (!creditInfo.creditLimit || creditInfo.creditLimit <= 0) {
      // Don't block here - let server-side validation handle it
      return false
    }
    
    // If creditLimit > 0, check if order would exceed it
    const newBalance = (creditInfo.balance || 0) + newTotal
    return newBalance > creditInfo.creditLimit
  })()

  const handleQuantityChange = (newQty: number, shouldCheckCredit: boolean = false) => {
    const clamped = Math.max(1, Math.min(newQty, maxQuantity))
    
    // Check credit limit if requested
    if (shouldCheckCredit && creditInfo) {
      const productTotal = product.price * clamped
      const newTotal = total + productTotal
      if (creditInfo.creditLimit && creditInfo.creditLimit > 0) {
        const newBalance = (creditInfo.balance || 0) + newTotal
        if (newBalance > creditInfo.creditLimit) {
          setError(`Plafond de crédit dépassé. Votre plafond est ${creditInfo.creditLimit.toFixed(2)}€, solde dû ${(creditInfo.balance || 0).toFixed(2)}€, cet article ${productTotal.toFixed(2)}€. Total après ajout: ${newBalance.toFixed(2)}€. Veuillez contacter la société.`)
          return // Don't update quantity
        }
      } else if (newTotal > 0) {
        setError('Aucun crédit autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
        return // Don't update quantity
      }
      // If we get here, the quantity is valid - clear any previous error
      setError('')
    } else if (!shouldCheckCredit) {
      // If not checking credit, just update quantity (for decrease button)
      setError('')
    }
    
    setQuantity(clamped)
  }

  const handleAddToCart = () => {
    if (isOutOfStock) {
      setError('Rupture de stock')
      return
    }

    if (quantity > product.stock) {
      setError(`Stock insuffisant. Disponible: ${product.stock}`)
      return
    }

    if (quantity < 1) {
      setError('La quantité doit être au moins 1')
      return
    }

    // Check credit limit before adding
    if (wouldExceedCreditLimit) {
      if (creditInfo && creditInfo.creditLimit && creditInfo.creditLimit > 0) {
        const productTotal = product.price * quantity
        const newTotal = total + productTotal
        const newBalance = (creditInfo.balance || 0) + newTotal
        setError(`Plafond de crédit dépassé. Votre plafond est ${creditInfo.creditLimit.toFixed(2)}€, solde dû ${(creditInfo.balance || 0).toFixed(2)}€, cet article ${productTotal.toFixed(2)}€. Total après ajout: ${newBalance.toFixed(2)}€. Veuillez contacter la société.`)
      } else {
        setError('Aucun crédit autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
      }
      return
    }

    setError('')
    addToCart(product, quantity)
    router.push(`/portal/cart?added=1&qty=${quantity}`)
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
      <div className="h-48 bg-gray-200 w-full flex items-center justify-center">
        {/* Placeholder for image */}
        <span className="text-gray-400">No Image</span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
            <p className="text-sm text-gray-500">{product.category}</p>
          </div>
          <span className="text-lg font-bold text-blue-600">{product.price.toFixed(2)} €</span>
        </div>
        
        <div className="mt-4 flex flex-col gap-2 mt-auto">
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full ${
              product.stock > 10 ? 'bg-green-100 text-green-800' : 
              product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {isOutOfStock ? 'Rupture' : `${product.stock} en stock`}
            </span>
          </div>

          {!isOutOfStock && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
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
                  onChange={(e) => {
                    const newQty = parseInt(e.target.value) || 1
                    handleQuantityChange(newQty, true) // Check credit when changing quantity
                  }}
                  disabled={isOutOfStock}
                  className="w-12 text-center text-sm border-0 focus:ring-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1, true)}
                  disabled={quantity >= maxQuantity || isOutOfStock}
                  className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Augmenter la quantité"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button 
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="flex items-center space-x-1 bg-blue-900 text-white px-3 py-2 rounded-md hover:bg-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-4 w-4" />
                <span className="text-sm">Ajouter</span>
              </button>
            </div>
          )}

          {isOutOfStock && (
            <button 
              disabled
              className="flex items-center justify-center space-x-1 bg-gray-300 text-gray-500 px-3 py-2 rounded-md cursor-not-allowed"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm">Rupture de stock</span>
            </button>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
