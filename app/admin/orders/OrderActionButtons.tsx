'use client'

import { updateOrderStatus, approveOrderAction } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ShipOrderModal from './ShipOrderModal'
import DeliverOrderModal from './DeliverOrderModal'

type OrderActionButtonsProps = {
  orderId: string
  orderNumber: string
  currentStatus: string
  requiresAdminApproval?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  'CONFIRMED': 'Confirmée',
  'PREPARED': 'Préparée',
  'SHIPPED': 'Expédiée',
  'DELIVERED': 'Livrée',
  'CANCELLED': 'Annulée'
}

const ACTION_BUTTONS: Record<string, { label: string; nextStatus: string; className: string }[]> = {
  'CONFIRMED': [
    { label: 'Préparer', nextStatus: 'PREPARED', className: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Annuler', nextStatus: 'CANCELLED', className: 'bg-red-600 hover:bg-red-700' }
  ],
  'PREPARED': [
    { label: 'Expédier', nextStatus: 'SHIPPED', className: 'bg-purple-600 hover:bg-purple-700' },
    { label: 'Annuler', nextStatus: 'CANCELLED', className: 'bg-red-600 hover:bg-red-700' }
  ],
  'SHIPPED': [
    { label: 'Livrer', nextStatus: 'DELIVERED', className: 'bg-green-600 hover:bg-green-700' }
  ],
  'DELIVERED': [],
  'CANCELLED': []
}

export default function OrderActionButtons({ orderId, orderNumber, currentStatus, requiresAdminApproval = false }: OrderActionButtonsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showShipModal, setShowShipModal] = useState(false)
  const [showDeliverModal, setShowDeliverModal] = useState(false)
  const router = useRouter()

  // Get available actions with specific rules:
  // - "Préparer" visible only if status === 'CONFIRMED' (not PREPARED)
  // - "Expédier" visible only if status === 'PREPARED' AND !requiresAdminApproval
  // - "Livrer" visible only if status === 'SHIPPED'
  // - Filter out "Préparer/Expédier/Livrer" if requiresAdminApproval (but keep "Annuler")
  const getAvailableActions = () => {
    const allActions = ACTION_BUTTONS[currentStatus] || []
    
    if (requiresAdminApproval) {
      // Only show "Annuler" if it's available for this status
      return allActions.filter(action => action.nextStatus === 'CANCELLED')
    }
    
    // Apply specific visibility rules
    return allActions.filter(action => {
      // "Préparer" button: only show if status is CONFIRMED (not PREPARED)
      if (action.nextStatus === 'PREPARED') {
        return currentStatus === 'CONFIRMED'
      }
      // "Expédier" button: only show if status is PREPARED and no admin alert
      if (action.nextStatus === 'SHIPPED') {
        return currentStatus === 'PREPARED' && !requiresAdminApproval
      }
      // "Livrer" button: only show if status is SHIPPED
      if (action.nextStatus === 'DELIVERED') {
        return currentStatus === 'SHIPPED'
      }
      // Other actions (like "Annuler") are shown normally
      return true
    })
  }

  const availableActions = getAvailableActions()

  const handleAction = async (nextStatus: string, label: string) => {
    // Special handling for SHIPPED and DELIVERED - open modals instead
    if (nextStatus === 'SHIPPED') {
      setShowShipModal(true)
      return
    }
    if (nextStatus === 'DELIVERED') {
      setShowDeliverModal(true)
      return
    }

    // Regular status update for other statuses
    setIsProcessing(nextStatus)
    setError(null)
    setSuccess(null)

    const result = await updateOrderStatus(orderId, nextStatus)
    
    if (result.error) {
      setError(result.error)
      setIsProcessing(null)
    } else {
      setSuccess(`Commande ${label.toLowerCase()} avec succès. Statut: ${STATUS_LABELS[nextStatus] || nextStatus}`)
      setTimeout(() => {
        router.refresh()
        setSuccess(null)
      }, 1500)
      setIsProcessing(null)
    }
  }

  const handleApprove = async () => {
    setIsProcessing('approve')
    setError(null)
    setSuccess(null)

    const result = await approveOrderAction(orderId)
    
    if (result.error) {
      setError(result.error)
      setIsProcessing(null)
    } else {
      setSuccess('Commande approuvée avec succès')
      setTimeout(() => {
        router.refresh()
        setSuccess(null)
      }, 1500)
      setIsProcessing(null)
    }
  }

  // If requires admin approval, show "Valider" button and "Annuler" if available
  if (requiresAdminApproval) {
    return (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleApprove}
              disabled={isProcessing !== null}
              className="px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700"
            >
              {isProcessing === 'approve' ? 'Validation...' : 'Valider'}
            </button>
            {availableActions.map((action) => (
              <button
                key={action.nextStatus}
                onClick={() => handleAction(action.nextStatus, action.label)}
                disabled={isProcessing !== null}
                className={`px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
              >
                {isProcessing === action.nextStatus ? 'Traitement...' : action.label}
              </button>
            ))}
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              {success}
            </div>
          )}
        </div>
        <ShipOrderModal
          isOpen={showShipModal}
          onClose={() => setShowShipModal(false)}
          orderId={orderId}
          orderNumber={orderNumber}
        />
        <DeliverOrderModal
          isOpen={showDeliverModal}
          onClose={() => setShowDeliverModal(false)}
          orderId={orderId}
          orderNumber={orderNumber}
        />
      </>
    )
  }

  if (availableActions.length === 0) {
    return (
      <span className="text-sm text-gray-500 italic">
        {currentStatus === 'DELIVERED' ? 'Commande livrée' : 'Commande annulée'}
      </span>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {availableActions.map((action) => (
            <button
              key={action.nextStatus}
              onClick={() => handleAction(action.nextStatus, action.label)}
              disabled={isProcessing !== null}
              className={`px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${action.className}`}
            >
              {isProcessing === action.nextStatus ? 'Traitement...' : action.label}
            </button>
          ))}
        </div>
        {error && (
          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            {success}
          </div>
        )}
      </div>
      <ShipOrderModal
        isOpen={showShipModal}
        onClose={() => setShowShipModal(false)}
        orderId={orderId}
        orderNumber={orderNumber}
      />
      <DeliverOrderModal
        isOpen={showDeliverModal}
        onClose={() => setShowDeliverModal(false)}
        orderId={orderId}
        orderNumber={orderNumber}
      />
    </>
  )
}
