'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateOrderDeliveryInfo } from '@/app/actions/admin-orders'

type DeliveryInformationFormProps = {
  orderId: string
  shippedAt: Date | string | null
  deliveredAt: Date | string | null
  initialValues: {
    deliveryCity: string | null
    deliveryAddress: string | null
    deliveryPhone: string | null
    deliveryNote: string | null
    deliveryAgentName: string | null
    deliveredToName: string | null
    deliveryProofNote: string | null
  }
}

function formatDateTime(value: Date | string | null): string {
  if (!value) return '-'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('fr-FR')
}

export default function DeliveryInformationForm({
  orderId,
  shippedAt,
  deliveredAt,
  initialValues,
}: DeliveryInformationFormProps) {
  const router = useRouter()

  const initial = useMemo(
    () => ({
      deliveryCity: initialValues.deliveryCity ?? '',
      deliveryAddress: initialValues.deliveryAddress ?? '',
      deliveryPhone: initialValues.deliveryPhone ?? '',
      deliveryNote: initialValues.deliveryNote ?? '',
      deliveryAgentName: initialValues.deliveryAgentName ?? '',
      deliveredToName: initialValues.deliveredToName ?? '',
      deliveryProofNote: initialValues.deliveryProofNote ?? '',
    }),
    [initialValues]
  )

  const [values, setValues] = useState(initial)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const onChange = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }))
  }

  const onReset = () => {
    setValues(initial)
    setError(null)
    setSuccess(null)
  }

  const onSave = async () => {
    setIsSaving(true)
    setError(null)
    setSuccess(null)

    const result = await updateOrderDeliveryInfo(orderId, {
      deliveryCity: values.deliveryCity,
      deliveryAddress: values.deliveryAddress,
      deliveryPhone: values.deliveryPhone,
      deliveryNote: values.deliveryNote,
      deliveryAgentName: values.deliveryAgentName,
      deliveredToName: values.deliveredToName,
      deliveryProofNote: values.deliveryProofNote,
    })

    if (result?.error) {
      setError(result.error)
      setIsSaving(false)
      return
    }

    setSuccess('Informations enregistrées.')
    setIsSaving(false)
    router.refresh()
    setTimeout(() => setSuccess(null), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">Ville</label>
          <input
            value={values.deliveryCity}
            onChange={onChange('deliveryCity')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            placeholder="Ex: Casablanca"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Téléphone</label>
          <input
            value={values.deliveryPhone}
            onChange={onChange('deliveryPhone')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            placeholder="Ex: +212..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Adresse</label>
          <input
            value={values.deliveryAddress}
            onChange={onChange('deliveryAddress')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            placeholder="Adresse complète"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Note de livraison</label>
          <textarea
            value={values.deliveryNote}
            onChange={onChange('deliveryNote')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
            placeholder="Instructions particulières..."
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-xs font-medium text-gray-500">Expédiée le</div>
          <div className="text-sm text-gray-900">{formatDateTime(shippedAt)}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-xs font-medium text-gray-500">Livrée le</div>
          <div className="text-sm text-gray-900">{formatDateTime(deliveredAt)}</div>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <div className="text-xs font-medium text-gray-500">Statut</div>
          <div className="text-sm text-gray-900">Voir “Statut” ci-dessus</div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Preuve de livraison</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nom du livreur</label>
            <input
              value={values.deliveryAgentName}
              onChange={onChange('deliveryAgentName')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="Ex: Ahmed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Livrée à (nom)</label>
            <input
              value={values.deliveredToName}
              onChange={onChange('deliveredToName')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="Ex: Réception / Dr ..."
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Note / preuve</label>
            <textarea
              value={values.deliveryProofNote}
              onChange={onChange('deliveryProofNote')}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
              placeholder="Ex: Signature, photo, commentaire..."
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-700 rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Réinitialiser
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
        {success && <span className="text-sm text-green-600">{success}</span>}
      </div>
    </div>
  )
}

