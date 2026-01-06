'use client'

import { updateDeliveryInfoAction } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DeliveryInfoFormProps = {
  orderId: string
  initialData: {
    deliveryCity?: string | null
    deliveryAddress?: string | null
    deliveryPhone?: string | null
    deliveryNote?: string | null
  }
  isDisabled: boolean // true if order is delivered
}

export default function DeliveryInfoForm({ orderId, initialData, isDisabled }: DeliveryInfoFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const result = await updateDeliveryInfoAction(orderId, {
      deliveryCity: formData.get('deliveryCity') as string || null,
      deliveryAddress: formData.get('deliveryAddress') as string || null,
      deliveryPhone: formData.get('deliveryPhone') as string || null,
      deliveryNote: formData.get('deliveryNote') as string || null,
    })

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setSuccess(true)
      setIsEditing(false)
      setIsSubmitting(false)
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
      }, 1500)
    }
  }

  // Mode lecture seule (affichage des valeurs)
  if (!isEditing) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <dl className="flex-1 space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Ville</dt>
              <dd className="text-sm text-gray-900 mt-1">{initialData.deliveryCity || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Adresse</dt>
              <dd className="text-sm text-gray-900 mt-1">{initialData.deliveryAddress || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
              <dd className="text-sm text-gray-900 mt-1">{initialData.deliveryPhone || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Note</dt>
              <dd className="text-sm text-gray-900 mt-1">{initialData.deliveryNote || '—'}</dd>
            </div>
          </dl>
          {!isDisabled && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="ml-4 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
            >
              Modifier
            </button>
          )}
        </div>
      </div>
    )
  }

  // Mode édition (formulaire inline)
  return (
    <form action={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs">
          Informations de livraison mises à jour
        </div>
      )}
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Ville</label>
        <input
          type="text"
          name="deliveryCity"
          defaultValue={initialData.deliveryCity || ''}
          disabled={isSubmitting}
          className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Ville"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Adresse</label>
        <textarea
          name="deliveryAddress"
          rows={2}
          defaultValue={initialData.deliveryAddress || ''}
          disabled={isSubmitting}
          className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Adresse complète"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Téléphone</label>
        <input
          type="text"
          name="deliveryPhone"
          defaultValue={initialData.deliveryPhone || ''}
          disabled={isSubmitting}
          className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Téléphone"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Note</label>
        <textarea
          name="deliveryNote"
          rows={2}
          defaultValue={initialData.deliveryNote || ''}
          disabled={isSubmitting}
          className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          placeholder="Instructions spéciales..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsEditing(false)
            setError(null)
            setSuccess(false)
          }}
          disabled={isSubmitting}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
