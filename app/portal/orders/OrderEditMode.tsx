'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Edit, X, Check } from 'lucide-react'
import { updateOrderItemsAction } from '@/app/actions/order'
import { getUserCreditInfo } from '@/app/actions/user'
import AddProductPanel from './AddProductPanel'

type OrderItem = {
  id: string
  productId: string
  productVariantId?: string | null
  quantity: number
  priceAtTime: number
  product: {
    id: string
    name: string
    price: number
    stock: number
  }
}

type OrderEditModeProps = {
  orderId: string
  items: OrderItem[]
  isOrderModifiable: boolean
  currentOrderTotal: number
  onEditModeChange?: (isEditing: boolean) => void
  editQuantities?: Record<string, number>
  onValidate?: (quantities: Record<string, number>) => Promise<void>
  onItemsAdded?: () => void
}

export default function OrderEditMode({ 
  orderId, 
  items, 
  isOrderModifiable,
  currentOrderTotal,
  onEditModeChange,
  editQuantities: externalQuantities,
  onValidate,
  onItemsAdded
}: OrderEditModeProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditInfo, setCreditInfo] = useState<{ balance: number; creditLimit: number; available: number } | null>(null)

  // Fetch credit info when editing
  useEffect(() => {
    if (isEditing) {
      getUserCreditInfo().then((result) => {
        if (result && 'balance' in result && !('error' in result && result.error)) {
          setCreditInfo(result as { balance: number; creditLimit: number; available: number })
        }
      }).catch(() => {
        // Silently fail
      })
    }
  }, [isEditing])

  // Use external quantities if provided, otherwise use local state
  const quantities = externalQuantities !== undefined ? externalQuantities : localQuantities

  // Calculate new order total based on edited quantities
  const calculateNewTotal = () => {
    let total = 0
    items.forEach(item => {
      const qty = quantities[item.id] ?? item.quantity
      total += item.priceAtTime * qty
    })
    return total
  }

  // Check if order would exceed credit limit
  const wouldExceedCreditLimit = (() => {
    if (!creditInfo) return false
    if (!creditInfo.creditLimit || creditInfo.creditLimit <= 0) {
      return calculateNewTotal() > 0
    }
    const newTotal = calculateNewTotal()
    const newBalance = (creditInfo.balance || 0) + (newTotal - currentOrderTotal)
    return newBalance > creditInfo.creditLimit
  })()

  // Initialize quantities with current values
  const initializeQuantities = () => {
    const initial: Record<string, number> = {}
    items.forEach(item => {
      initial[item.id] = item.quantity
    })
    if (externalQuantities === undefined) {
      setLocalQuantities(initial)
    }
  }

  const handleStartEdit = () => {
    initializeQuantities()
    setIsEditing(true)
    setError(null)
    if (onEditModeChange) onEditModeChange(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (externalQuantities === undefined) {
      setLocalQuantities({})
    }
    setError(null)
    if (onEditModeChange) onEditModeChange(false)
  }

  const handleAddProductSuccess = () => {
    if (onItemsAdded) {
      onItemsAdded()
    } else {
      router.refresh()
    }
  }

  const handleValidate = async () => {
    // Check credit limit first
    if (wouldExceedCreditLimit) {
      setError('Cette modification dépasserait votre plafond de crédit. Veuillez contacter la société pour augmenter votre plafond ou réduire les quantités.')
      return
    }

    // Check if there are any changes
    const hasChanges = items.some(item => {
      const newQty = quantities[item.id] ?? item.quantity
      return newQty !== item.quantity
    })

    if (!hasChanges) {
      handleCancelEdit()
      return
    }

    // Validate all quantities
    for (const item of items) {
      const newQty = quantities[item.id] ?? item.quantity
      
      if (item.product.stock <= 0 && newQty > 0) {
        setError(`Produit "${item.product.name}" en rupture de stock`)
        return
      }

      if (newQty > item.product.stock) {
        setError(`Stock insuffisant pour "${item.product.name}". Disponible: ${item.product.stock}`)
        return
      }
    }

    setIsSaving(true)
    setError(null)

    try {
      if (onValidate) {
        // Use parent's validate function
        await onValidate(quantities)
        handleCancelEdit()
      } else {
        // Prepare items with changes
        const itemsToUpdate = items
          .filter(item => {
            const newQty = quantities[item.id] ?? item.quantity
            return newQty !== item.quantity
          })
          .map(item => ({
            orderItemId: item.id,
            newQuantity: quantities[item.id] ?? item.quantity
          }))

        if (itemsToUpdate.length === 0) {
          handleCancelEdit()
          return
        }

        const result = await updateOrderItemsAction(orderId, itemsToUpdate)
        
        if (result.error) {
          setError(result.error)
          setIsSaving(false)
        } else {
          // Success - refresh page
          router.refresh()
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la validation des modifications')
      setIsSaving(false)
    }
  }

  // Don't show anything for non-modifiable orders (paid or delivered)
  if (!isOrderModifiable) {
    return null
  }

  // G1: Ne pas afficher si commande non modifiable
  if (!isOrderModifiable) {
    return null
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleStartEdit}
        className="flex items-center gap-1 px-4 py-2 text-sm rounded-md bg-blue-900 text-white hover:bg-blue-800 transition-all duration-200"
        title="Modifier les quantités de cette commande"
      >
        <Edit className="h-4 w-4" />
        <span>Modifier la commande</span>
      </button>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <AddProductPanel
            orderId={orderId}
            existingProductIds={items.map(item => item.productVariantId ? `${item.productId}:${item.productVariantId}` : item.productId)}
            onAddSuccess={handleAddProductSuccess}
          />
          <button
            type="button"
            onClick={handleCancelEdit}
            disabled={isSaving}
            className="flex items-center gap-1 px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            <span>Annuler</span>
          </button>
          <button
            type="button"
            onClick={handleValidate}
            disabled={isSaving || wouldExceedCreditLimit}
            className={`flex items-center gap-1 px-4 py-2 text-sm rounded-md transition-all duration-200 ${
              isSaving
                ? 'bg-green-300 text-white cursor-wait'
                : wouldExceedCreditLimit
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title={wouldExceedCreditLimit ? 'Plafond de crédit dépassé. Veuillez contacter la société.' : ''}
          >
            {isSaving ? (
              <>
                <span className="animate-pulse">...</span>
                <span>Validation...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Valider les modifications</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="text-xs text-red-700 bg-red-100 border border-red-300 px-3 py-2 rounded-md">
            {error}
          </div>
        )}
        {wouldExceedCreditLimit && creditInfo && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-md">
            <div className="font-semibold mb-1">⚠️ Plafond de crédit dépassé</div>
            <div className="text-xs">
              Votre plafond est de {creditInfo.creditLimit.toFixed(2)}, votre solde actuel est de {(creditInfo.balance || 0).toFixed(2)}.
              <br />
              Cette modification porterait le total à {calculateNewTotal().toFixed(2)}, ce qui dépasserait votre plafond.
              <br />
              <strong>Veuillez contacter la société pour augmenter votre plafond de crédit ou réduire les quantités.</strong>
            </div>
          </div>
        )}
        {creditInfo && !wouldExceedCreditLimit && (
          <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 px-3 py-2 rounded-md">
            <div>Crédit disponible: {creditInfo.available.toFixed(2)}</div>
            <div>Nouveau total après modification: {calculateNewTotal().toFixed(2)}</div>
          </div>
        )}
        <div className="text-xs text-gray-600 italic">
          Modifiez les quantités ci-dessous ou ajoutez de nouveaux produits, puis cliquez sur "Valider les modifications"
        </div>
      </div>
    </>
  )
}

export type { OrderItem }
export type { OrderEditModeProps }

