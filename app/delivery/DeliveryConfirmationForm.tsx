'use client'

import { confirmDeliveryWithCodeAction } from '@/app/actions/delivery'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type DeliveryConfirmationFormProps = {
  orderId: string
  orderNumber: string
}

export default function DeliveryConfirmationForm({
  orderId,
  orderNumber
}: DeliveryConfirmationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    deliveredToName: '',
    deliveryProofNote: ''
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await confirmDeliveryWithCodeAction(
        orderId,
        formData.code,
        formData.deliveredToName,
        formData.deliveryProofNote || undefined
      )

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        toast.success(`Livraison confirmée pour la commande ${orderNumber}`)
        router.refresh()
        // Reset form
        setFormData({
          code: '',
          deliveredToName: '',
          deliveryProofNote: ''
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4 mt-4">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Confirmer la livraison</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code de confirmation <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            required
            maxLength={6}
            disabled={isSubmitting}
            data-testid="delivery-confirmation-code"
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 text-center font-mono text-lg tracking-wider"
            placeholder="000000"
          />
          <p className="text-xs text-gray-500 mt-1">
            Demandez ce code au client (affiché sur son bon de livraison)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reçu par <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.deliveredToName}
            onChange={(e) => setFormData({ ...formData, deliveredToName: e.target.value })}
            required
            disabled={isSubmitting}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Nom de la personne qui a reçu"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note (optionnel)
          </label>
          <input
            type="text"
            value={formData.deliveryProofNote}
            onChange={(e) => setFormData({ ...formData, deliveryProofNote: e.target.value })}
            disabled={isSubmitting}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            placeholder="Observations..."
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !formData.code || !formData.deliveredToName}
          data-testid="confirm-delivery-button"
          className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Confirmation...' : 'Confirmer la livraison'}
        </button>
      </div>
    </form>
  )
}
