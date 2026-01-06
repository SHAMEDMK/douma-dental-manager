'use client'

import { useCart } from '../CartContext'
import { createOrderAction } from '@/app/actions/order'
import { getUserCreditInfo } from '@/app/actions/user'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Minus, Check } from 'lucide-react'
import ClearCartModal from './ClearCartModal'
import CreditSummary from './CreditSummary'

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, total, clearCart } = useCart()
  const cartTotal = total
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showClearModal, setShowClearModal] = useState(false)
  const [showAddedBanner, setShowAddedBanner] = useState(false)
  const [addedQuantity, setAddedQuantity] = useState<number | null>(null)
  const [creditInfo, setCreditInfo] = useState<{ balance: number; creditLimit: number; available: number } | null>(null)
  const [creditBlocked, setCreditBlocked] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Fetch user credit info (kept for quantity button logic)
  useEffect(() => {
    getUserCreditInfo().then((result) => {
      // Check if result has balance property (success) or error property
      if (result && 'balance' in result && !('error' in result && result.error)) {
        setCreditInfo(result as { balance: number; creditLimit: number; available: number })
      }
      // If there's an error, we just don't show credit info (graceful degradation)
    }).catch(() => {
      // Silently fail - credit info is optional for display
    })
  }, [])

  // Check for added query param and show banner
  useEffect(() => {
    const added = searchParams.get('added')
    const qty = searchParams.get('qty')
    
    if (added === '1') {
      setShowAddedBanner(true)
      if (qty) {
        setAddedQuantity(parseInt(qty) || null)
      }
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        setShowAddedBanner(false)
        // Remove query params from URL
        router.replace('/portal/cart', { scroll: false })
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [searchParams, router])

  const handleClearCart = () => {
    clearCart()
    setShowClearModal(false)
  }

  // Calculate if order would exceed credit limit
  // Rules:
  // 1. If creditLimit = 0 or null: no credit allowed, block if total > 0
  // 2. If creditLimit > 0: block if (balance + total) > creditLimit
  const canPlaceOrder = (() => {
    // If credit info not loaded yet, allow (will be validated server-side)
    if (!creditInfo) return true
    
    // If creditLimit is 0 or null/undefined, no credit is allowed
    if (!creditInfo.creditLimit || creditInfo.creditLimit <= 0) {
      // Block if there's any order total (total > 0)
      return total <= 0
    }
    
    // If creditLimit > 0, check if order would exceed it
    const newBalance = (creditInfo.balance || 0) + total
    return newBalance <= creditInfo.creditLimit
  })()

  const wouldExceedCreditLimit = !canPlaceOrder

  const handleCheckout = async () => {
    // Prevent submission if disabled
    if (creditBlocked || items.length === 0) {
      return
    }

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

      {showAddedBanner && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-sm font-medium text-green-800">
              {addedQuantity 
                ? `✅ ${addedQuantity} article${addedQuantity > 1 ? 's' : ''} ajouté${addedQuantity > 1 ? 's' : ''} au panier`
                : '✅ Ajouté au panier'}
            </p>
          </div>
        </div>
      )}

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
                      // Check if increasing quantity would exceed credit limit
                      if (creditInfo && newQty > item.quantity) {
                        const additionalTotal = (newQty - item.quantity) * item.price
                        const newTotal = total + additionalTotal
                        if (creditInfo.creditLimit && creditInfo.creditLimit > 0) {
                          const newBalance = (creditInfo.balance || 0) + newTotal
                          if (newBalance > creditInfo.creditLimit) {
                            setError(`Plafond de crédit dépassé. Votre plafond est ${creditInfo.creditLimit.toFixed(2)}€, solde dû ${(creditInfo.balance || 0).toFixed(2)}€, cette modification porterait le total à ${newBalance.toFixed(2)}€. Veuillez contacter la société.`)
                            return // Don't update if it would exceed limit
                          }
                        } else if (newTotal > 0) {
                          setError('Aucun crédit autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
                          return // No credit allowed
                        }
                      }
                      setError('') // Clear error if valid
                      updateQuantity(item.productId, Math.max(1, newQty))
                    }}
                    disabled={wouldExceedCreditLimit && item.quantity > 0}
                    className="w-16 text-center text-sm border-0 focus:ring-0 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // Check if increasing quantity would exceed credit limit
                      if (creditInfo) {
                        const additionalTotal = item.price
                        const newTotal = total + additionalTotal
                        if (creditInfo.creditLimit && creditInfo.creditLimit > 0) {
                          const newBalance = (creditInfo.balance || 0) + newTotal
                          if (newBalance > creditInfo.creditLimit) {
                            setError(`Plafond de crédit dépassé. Votre plafond est ${creditInfo.creditLimit.toFixed(2)}€, solde dû ${(creditInfo.balance || 0).toFixed(2)}€, cette modification porterait le total à ${newBalance.toFixed(2)}€. Veuillez contacter la société.`)
                            return // Don't update if it would exceed limit
                          }
                        } else if (newTotal > 0) {
                          setError('Aucun crédit autorisé. Veuillez contacter le vendeur pour définir un plafond de crédit.')
                          return // No credit allowed
                        }
                      }
                      setError('') // Clear error if valid
                      updateQuantity(item.productId, item.quantity + 1)
                    }}
                    disabled={wouldExceedCreditLimit}
                    className="p-1 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Augmenter la quantité"
                    title={wouldExceedCreditLimit ? 'Plafond de crédit dépassé' : ''}
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

      {/* Credit summary card */}
      <div className="mb-4">
        <CreditSummary cartTotal={cartTotal} onBlockedChange={setCreditBlocked} />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowClearModal(true)}
          className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 sm:w-auto"
        >
          Annuler / Vider le panier
        </button>
        
        {/* Primary Actions Group */}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center sm:justify-end">
          {/* Secondary: Continuer l'achat - always enabled */}
          <Link
            href="/portal"
            className="px-6 py-2.5 border-2 border-blue-900 rounded-md shadow-sm text-sm font-semibold text-blue-900 bg-white hover:bg-blue-50 transition-colors text-center sm:text-left"
          >
            Continuer l'achat
          </Link>
          
          {/* Primary: Valider la commande */}
          <button
            onClick={handleCheckout}
            disabled={creditBlocked || isSubmitting || items.length === 0}
            className="px-6 py-2.5 border border-transparent rounded-md shadow-md text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
