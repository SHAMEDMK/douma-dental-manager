'use client'

import { markOrderDeliveredAction } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DeliverOrderModalProps = {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
}

export default function DeliverOrderModal({ isOpen, onClose, orderId, orderNumber }: DeliverOrderModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)

    const deliveredToName = formData.get('deliveredToName') as string
    const deliveryProofNote = formData.get('deliveryProofNote') as string
    const deliveredAtStr = formData.get('deliveredAt') as string

    if (!deliveredToName || deliveredToName.trim() === '') {
      setError('Le nom de la personne qui a reçu est requis')
      setIsSubmitting(false)
      return
    }

    const result = await markOrderDeliveredAction(orderId, {
      deliveredToName,
      deliveryProofNote: deliveryProofNote || undefined,
      deliveredAt: deliveredAtStr || undefined,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      router.refresh()
      onClose()
    }
  }

  // Default date to now
  const now = new Date().toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form action={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Livraison
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reçu par <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="deliveredToName"
                  required
                  disabled={isSubmitting}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  placeholder="Nom de la personne qui a reçu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note de preuve de livraison
                </label>
                <textarea
                  name="deliveryProofNote"
                  rows={3}
                  disabled={isSubmitting}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                  placeholder="Observations, commentaires..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de livraison
                </label>
                <input
                  type="datetime-local"
                  name="deliveredAt"
                  defaultValue={now}
                  disabled={isSubmitting}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Livraison...' : 'Confirmer la livraison'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
