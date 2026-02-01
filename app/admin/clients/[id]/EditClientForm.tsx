'use client'

import { useState } from 'react'
import { updateClient } from '@/app/actions/client'
import { useRouter } from 'next/navigation'

type Client = {
  id: string
  name: string
  clientCode: string | null
  companyName: string | null
  segment: string | null
  discountRate: number | null
  creditLimit: number | null
  phone: string | null
  address: string | null
  city: string | null
  ice: string | null
}

type EditClientFormProps = {
  client: Client
}

export default function EditClientForm({ client }: EditClientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)
    setSuccess(false)

    const name = formData.get('name') as string
    const clientCodeRaw = formData.get('clientCode') as string
    const clientCode = clientCodeRaw?.trim() || null
    const companyName = formData.get('companyName') as string
    const segment = formData.get('segment') as string
    const discountRateStr = formData.get('discountRate') as string
    const discountRate = discountRateStr === '' ? null : parseFloat(discountRateStr)
    const creditLimitStr = formData.get('creditLimit') as string
    const creditLimit = creditLimitStr === '' ? null : parseFloat(creditLimitStr)
    const phone = formData.get('phone') as string
    const address = formData.get('address') as string
    const city = formData.get('city') as string
    const ice = formData.get('ice') as string

    const result = await updateClient(client.id, {
      name,
      clientCode,
      companyName: companyName || undefined,
      segment: segment as 'LABO' | 'DENTISTE' | 'REVENDEUR',
      discountRate,
      creditLimit,
      phone: phone || null,
      address: address || null,
      city: city || null,
      ice: ice || null
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        router.refresh()
      }, 1000)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="clientCode" className="block text-sm font-medium text-gray-700">
          Code client
        </label>
        <input
          type="text"
          name="clientCode"
          id="clientCode"
          defaultValue={client.clientCode ?? ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Ex: CLI-001"
        />
        <p className="mt-0.5 text-xs text-gray-500">Optionnel, unique par client</p>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nom complet *
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          defaultValue={client.name}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        />
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Nom de l'entreprise
        </label>
        <input
          type="text"
          name="companyName"
          id="companyName"
          defaultValue={client.companyName || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        />
      </div>

      <div>
        <label htmlFor="segment" className="block text-sm font-medium text-gray-700">
          Segment *
        </label>
        <select
          name="segment"
          id="segment"
          required
          defaultValue={client.segment || 'LABO'}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        >
          <option value="LABO">LABO</option>
          <option value="DENTISTE">DENTISTE</option>
          <option value="REVENDEUR">REVENDEUR</option>
        </select>
        <p className="mt-1 text-xs text-gray-500">Détermine les prix affichés pour ce client</p>
      </div>

      <div>
        <label htmlFor="discountRate" className="block text-sm font-medium text-gray-700">
          Remise client (%)
        </label>
        <input
          type="number"
          name="discountRate"
          id="discountRate"
          step="0.01"
          min="0"
          max="100"
          defaultValue={client.discountRate || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-gray-500">Remise en pourcentage appliquée sur les prix (ex: 5 = -5%). Laissez vide pour aucune remise.</p>
      </div>

      <div>
        <label htmlFor="creditLimit" className="block text-sm font-medium text-gray-700">
          Plafond de crédit (Dh) *
        </label>
        <input
          type="number"
          name="creditLimit"
          id="creditLimit"
          step="0.01"
          min="0"
          required
          defaultValue={client.creditLimit || 0}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        />
        <p className="mt-1 text-xs text-gray-500">Montant maximum de crédit autorisé pour ce client (0 = pas de crédit autorisé)</p>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Téléphone
        </label>
        <input
          type="tel"
          name="phone"
          id="phone"
          defaultValue={client.phone || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder="+212 6XX XXX XXX"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Adresse
        </label>
        <input
          type="text"
          name="address"
          id="address"
          defaultValue={client.address || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder="Rue, numéro..."
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
          Ville
        </label>
        <input
          type="text"
          name="city"
          id="city"
          defaultValue={client.city || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder="Ville"
        />
      </div>

      <div>
        <label htmlFor="ice" className="block text-sm font-medium text-gray-700">
          ICE (Identifiant Commun de l'Entreprise)
        </label>
        <input
          type="text"
          name="ice"
          id="ice"
          defaultValue={client.ice || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder="ICE (min. 5 caractères)"
        />
        <p className="mt-1 text-xs text-gray-500">ICE client (optionnel, minimum 5 caractères si rempli)</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">Client mis à jour avec succès</p>
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>
    </form>
  )
}
