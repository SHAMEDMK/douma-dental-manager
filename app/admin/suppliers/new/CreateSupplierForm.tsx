'use client'

import { createSupplierAction } from '@/app/actions/purchases'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function CreateSupplierForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const codeRaw = (fd.get('code') as string)?.trim() ?? ''
    const name = (fd.get('name') as string)?.trim() ?? ''
    const contact = (fd.get('contact') as string)?.trim() || undefined
    const email = (fd.get('email') as string)?.trim() || undefined
    const phone = (fd.get('phone') as string)?.trim() || undefined
    const address = (fd.get('address') as string)?.trim() || undefined
    const city = (fd.get('city') as string)?.trim() || undefined
    const ice = (fd.get('ice') as string)?.trim() || undefined
    const notes = (fd.get('notes') as string)?.trim() || undefined

    try {
      const result = await createSupplierAction({
        name,
        ...(codeRaw ? { code: codeRaw } : {}),
        contact,
        email,
        phone,
        address,
        city,
        ice,
        notes,
      })

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else if (result.supplierId) {
        toast.success(
          result.code ? `Fournisseur créé (${result.code})` : 'Fournisseur créé'
        )
        router.push(`/admin/suppliers/${result.supplierId}`)
      } else {
        const msg = 'Réponse serveur inattendue'
        setError(msg)
        toast.error(msg)
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Une erreur inattendue s'est produite"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Code fournisseur
          </label>
          <input
            type="text"
            id="code"
            name="code"
            disabled={isSubmitting}
            autoComplete="off"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
            placeholder="Ex : SUP-0001"
          />
          <p className="mt-1 text-xs text-gray-500">Laissez vide pour attribution automatique</p>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Raison sociale / nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="Ex : Dental Supplies SARL"
          />
        </div>

        <div>
          <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
            Contact
          </label>
          <input
            type="text"
            id="contact"
            name="contact"
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            placeholder="Nom du contact"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="contact@fournisseur.ma"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              disabled={isSubmitting}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              placeholder="+212 …"
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Adresse
          </label>
          <input
            type="text"
            id="address"
            name="address"
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700">
            Ville
          </label>
          <input
            type="text"
            id="city"
            name="city"
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label htmlFor="ice" className="block text-sm font-medium text-gray-700">
            ICE
          </label>
          <input
            type="text"
            id="ice"
            name="ice"
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            disabled={isSubmitting}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Création…' : 'Créer le fournisseur'}
          </button>
        </div>
      </form>
    </div>
  )
}
