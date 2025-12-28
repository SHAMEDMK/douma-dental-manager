'use client'

import { cancelOrderAction } from '@/app/actions/order'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CancelOrderModal from './CancelOrderModal'

type OrderActionsProps = {
  orderId: string
  orderNumber: string
  orderStatus: string
  invoiceStatus?: string | null
}

export default function OrderActions({ orderId, orderNumber, orderStatus, invoiceStatus }: OrderActionsProps) {
  const router = useRouter()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Rule: Can cancel if status is CONFIRMED or PREPARED, not paid, and not already cancelled/shipped/delivered
  const isCancellable = 
    (orderStatus === 'CONFIRMED' || orderStatus === 'PREPARED') &&
    invoiceStatus !== 'PAID'

  const handleCancel = async () => {
    setIsCancelling(true)
    setError(null)
    setSuccess(false)

    const result = await cancelOrderAction(orderId)

    if (result.error) {
      setError(result.error)
      setIsCancelling(false)
      setShowCancelModal(false)
    } else {
      setSuccess(true)
      setShowCancelModal(false)
      router.refresh()
    }
  }

  if (!isCancellable) return null

  return (
    <>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Commande annulée avec succès. Le stock a été remis en disponibilité.
        </div>
      )}
      <button
        onClick={() => setShowCancelModal(true)}
        disabled={isCancelling}
        className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
      >
        {isCancelling ? 'Annulation...' : 'Annuler la commande'}
      </button>
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        orderNumber={orderNumber}
      />
    </>
  )
}

