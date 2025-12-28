'use client'

import { useCart } from '../CartContext'
import { createOrderAction } from '@/app/actions/order'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus } from 'lucide-react'
import ClearCartModal from './ClearCartModal'

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total, clearCart } = useCart()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showClearModal, setShowClearModal] = useState(false)
  const router = useRouter()

  const handleClearCart = () => {
    clearCart()
    setShowClearModal(false)
  }

  const handleCheckout = async () => {
    setIsSubmitting(true)
    setError('')
    
    const result = await createOrderAction(items.map(i => ({ 
      productId: i.productId, 
      quantity: i.quantity 
    })))

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      clearCart()
      router.push('/portal/orders')
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Votre panier est vide</h2>
        <Link href="/portal" className="text-blue-600 hover:text-blue-800">
          Retourner au catalogue
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon Panier</h1>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <ul className="divide-y divide-gray-200">
          {items.map((item) => (
            <li key={item.productId} className="px-4 py-4 sm:px-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-blue-600">{item.name}</h3>
                <p className="text-sm text-gray-500">Prix unitaire: {item.price.toFixed(2)} €</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center border border-gray-300 rounded-md">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                    className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Diminuer la quantité"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newQty = parseInt(e.target.value) || 1
                      updateQuantity(item.productId, Math.max(1, newQty))
                    }}
                    className="w-16 text-center text-sm border-0 focus:ring-0 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="p-1 hover:bg-gray-100"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-bold text-gray-900 w-24 text-right">
                  {(item.price * item.quantity).toFixed(2)} €
                </span>
                <button
                  onClick={() => removeFromCart(item.productId)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="px-4 py-4 sm:px-6 bg-gray-50 flex justify-between items-center">
          <span className="text-lg font-bold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-blue-900">{total.toFixed(2)} €</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => setShowClearModal(true)}
          className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
        >
          Annuler / Vider le panier
        </button>
        <div className="flex space-x-4">
          <Link
            href="/portal"
            className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Continuer l'achat
          </Link>
          <button
            onClick={handleCheckout}
            disabled={isSubmitting}
            className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Validation...' : 'Valider la commande'}
          </button>
        </div>
      </div>

      <ClearCartModal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        onConfirm={handleClearCart}
      />
    </div>
  )
}
