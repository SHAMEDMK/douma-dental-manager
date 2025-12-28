'use client'

import { updateOrderStatus } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type OrderActionButtonsProps = {
  orderId: string
  currentStatus: string
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

export default function OrderActionButtons({ orderId, currentStatus }: OrderActionButtonsProps) {
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const availableActions = ACTION_BUTTONS[currentStatus] || []

  if (availableActions.length === 0) {
    return (
      <span className="text-sm text-gray-500 italic">
        {currentStatus === 'DELIVERED' ? 'Commande livrée' : 'Commande annulée'}
      </span>
    )
  }

  const handleAction = async (nextStatus: string, label: string) => {
    setIsProcessing(nextStatus)
    setError(null)
    setSuccess(null)

    const result = await updateOrderStatus(orderId, nextStatus)
    
    if (result.error) {
      setError(result.error)
      setIsProcessing(null)
    } else {
      setSuccess(`Commande ${label.toLowerCase()} avec succès`)
      setTimeout(() => {
        router.refresh()
        setSuccess(null)
      }, 1500)
      setIsProcessing(null)
    }
  }

  return (
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
  )
}
