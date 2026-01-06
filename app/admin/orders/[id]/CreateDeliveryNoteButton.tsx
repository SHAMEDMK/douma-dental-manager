'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDeliveryNoteAction } from '@/app/actions/admin-orders'

type CreateDeliveryNoteButtonProps = {
  orderId: string
  orderStatus: string
  hasDeliveryNote: boolean
}

export default function CreateDeliveryNoteButton({
  orderId,
  orderStatus,
  hasDeliveryNote
}: CreateDeliveryNoteButtonProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Don't show if already has deliveryNote
  if (hasDeliveryNote) {
    return null
  }

  // Only show if PREPARED (as per createDeliveryNoteAction rules)
  if (orderStatus !== 'PREPARED') {
    return null
  }

  async function handleCreate() {
    setIsCreating(true)
    setError(null)

    const result = await createDeliveryNoteAction(orderId)

    if (result.error) {
      setError(result.error)
      setIsCreating(false)
    } else {
      // Refresh to show the delivery note link
      router.refresh()
    }
  }

  return (
    <div className="mt-2">
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}
      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? 'Création...' : 'Créer bon de livraison'}
      </button>
    </div>
  )
}
