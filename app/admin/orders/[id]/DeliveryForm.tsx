'use client'

import { updateDeliveryInfoAction } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type DeliveryFormProps = {
  order: {
    id: string
    status: string
    deliveryCity?: string | null
    deliveryAddress?: string | null
    deliveryPhone?: string | null
    deliveryNote?: string | null
  }
}

export default function DeliveryForm({ order }: DeliveryFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const result = await updateDeliveryInfoAction(order.id, {
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
      }, 2000)
    }
  }

  const isDisabled = order.status === 'DELIVERED'

  // Mode lecture seule (affichage des valeurs)
  if (!isEditing) {
    return (
      <div>
        <dl className="space-y-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Ville</dt>
            <dd className="text-sm text-gray-900 mt-1">{order.deliveryCity || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Adresse</dt>
            <dd className="text-sm text-gray-900 mt-1">{order.deliveryAddress || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
            <dd className="text-sm text-gray-900 mt-1">{order.deliveryPhone || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Note livraison</dt>
            <dd className="text-sm text-gray-900 mt-1">{order.deliveryNote || '—'}</dd>
          </div>
        </dl>
        {!isDisabled && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="mt-4 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
          >
            Modifier livraison
          </button>
        )}
      </div>
    )
  }

  // Mode édition (formulaire inline)
  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
          ✅ Bien enregistré
        </div>
      )}

      <div>
        <label htmlFor="deliveryCity" className="block text-sm font-medium text-gray-700 mb-1">
          Ville
        </label>
        <input
          type="text"
          id="deliveryCity"
          name="deliveryCity"
          defaultValue={order.deliveryCity || ''}
          disabled={isSubmitting || isDisabled}
          className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Ville"
        />
      </div>

      <div>
        <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700 mb-1">
          Adresse
        </label>
        <textarea
          id="deliveryAddress"
          name="deliveryAddress"
          rows={3}
          defaultValue={order.deliveryAddress || ''}
          disabled={isSubmitting || isDisabled}
          className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Adresse complète"
        />
      </div>

      <div>
        <label htmlFor="deliveryPhone" className="block text-sm font-medium text-gray-700 mb-1">
          Téléphone
        </label>
        <input
          type="text"
          id="deliveryPhone"
          name="deliveryPhone"
          defaultValue={order.deliveryPhone || ''}
          disabled={isSubmitting || isDisabled}
          className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Téléphone"
        />
      </div>

      <div>
        <label htmlFor="deliveryNote" className="block text-sm font-medium text-gray-700 mb-1">
          Note livraison
        </label>
        <textarea
          id="deliveryNote"
          name="deliveryNote"
          rows={3}
          defaultValue={order.deliveryNote || ''}
          disabled={isSubmitting || isDisabled}
          className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Instructions spéciales..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting || isDisabled}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
