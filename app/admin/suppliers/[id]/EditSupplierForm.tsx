'use client'

import { updateSupplierAction } from '@/app/actions/purchases'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export type SupplierEditInitial = {
  id: string
  code: string
  name: string
  contact: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  ice: string | null
  notes: string | null
  isActive: boolean
}

type EditSupplierFormProps = {
  supplier: SupplierEditInitial
  canEditCode: boolean
  canEditActive: boolean
}

export default function EditSupplierForm({ supplier, canEditCode, canEditActive }: EditSupplierFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(supplier.isActive)

  useEffect(() => {
    setIsActive(supplier.isActive)
  }, [supplier.isActive])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const form = e.currentTarget
    const fd = new FormData(form)
    const name = (fd.get('name') as string)?.trim() ?? ''
    const contact = (fd.get('contact') as string)?.trim() || null
    const email = (fd.get('email') as string)?.trim() || null
    const phone = (fd.get('phone') as string)?.trim() || null
    const address = (fd.get('address') as string)?.trim() || null
    const city = (fd.get('city') as string)?.trim() || null
    const ice = (fd.get('ice') as string)?.trim() || null
    const notes = (fd.get('notes') as string)?.trim() || null

    const payload: {
      name: string
      contact: string | null
      email: string | null
      phone: string | null
      address: string | null
      city: string | null
      ice: string | null
      notes: string | null
      code?: string
      isActive?: boolean
    } = {
      name,
      contact,
      email,
      phone,
      address,
      city,
      ice,
      notes,
    }

    if (canEditCode) {
      payload.code = (fd.get('code') as string)?.trim() ?? ''
    }

    if (canEditActive) {
      payload.isActive = isActive
    }

    try {
      const result = await updateSupplierAction(supplier.id, payload)

      if (result.error) {
        setError(result.error)
        toast.error(result.error)
      } else {
        toast.success('Fournisseur enregistré')
        router.refresh()
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
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Modifier le fournisseur</h2>
      <p className="text-sm text-gray-500 mb-6">Enregistrez les modifications ci-dessous.</p>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="edit-supplier-code" className="block text-sm font-medium text-gray-700">
            Code fournisseur
            {canEditCode && <span className="text-red-500"> *</span>}
          </label>
          {canEditCode ? (
            <>
              <input
                type="text"
                id="edit-supplier-code"
                name="code"
                required
                disabled={isSubmitting}
                defaultValue={supplier.code}
                autoComplete="off"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">Le code ne peut pas être vide.</p>
            </>
          ) : (
            <>
              <p
                id="edit-supplier-code"
                className="mt-1 text-sm text-gray-900 font-mono py-2 px-0"
              >
                {supplier.code?.trim() ? supplier.code.trim() : '-'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Seul un administrateur peut modifier le code fournisseur.
              </p>
            </>
          )}
        </div>

        <div>
          <label htmlFor="edit-supplier-name" className="block text-sm font-medium text-gray-700">
            Raison sociale / nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="edit-supplier-name"
            name="name"
            required
            disabled={isSubmitting}
            defaultValue={supplier.name}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label htmlFor="edit-supplier-contact" className="block text-sm font-medium text-gray-700">
            Contact
          </label>
          <input
            type="text"
            id="edit-supplier-contact"
            name="contact"
            disabled={isSubmitting}
            defaultValue={supplier.contact ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="edit-supplier-email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="edit-supplier-email"
              name="email"
              disabled={isSubmitting}
              defaultValue={supplier.email ?? ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>
          <div>
            <label htmlFor="edit-supplier-phone" className="block text-sm font-medium text-gray-700">
              Téléphone
            </label>
            <input
              type="tel"
              id="edit-supplier-phone"
              name="phone"
              disabled={isSubmitting}
              defaultValue={supplier.phone ?? ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            />
          </div>
        </div>

        <div>
          <label htmlFor="edit-supplier-address" className="block text-sm font-medium text-gray-700">
            Adresse
          </label>
          <input
            type="text"
            id="edit-supplier-address"
            name="address"
            disabled={isSubmitting}
            defaultValue={supplier.address ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label htmlFor="edit-supplier-city" className="block text-sm font-medium text-gray-700">
            Ville
          </label>
          <input
            type="text"
            id="edit-supplier-city"
            name="city"
            disabled={isSubmitting}
            defaultValue={supplier.city ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div>
          <label htmlFor="edit-supplier-ice" className="block text-sm font-medium text-gray-700">
            ICE
          </label>
          <input
            type="text"
            id="edit-supplier-ice"
            name="ice"
            disabled={isSubmitting}
            defaultValue={supplier.ice ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
          />
        </div>

        <div>
          <label htmlFor="edit-supplier-notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            id="edit-supplier-notes"
            name="notes"
            rows={4}
            disabled={isSubmitting}
            defaultValue={supplier.notes ?? ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="edit-supplier-active"
            checked={isActive}
            onChange={(ev) => setIsActive(ev.target.checked)}
            disabled={isSubmitting || !canEditActive}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-900 focus:ring-blue-500 disabled:opacity-50"
          />
          <div>
            <label htmlFor="edit-supplier-active" className="text-sm font-medium text-gray-700">
              Fournisseur actif
            </label>
            {!canEditActive && (
              <p className="text-xs text-gray-500 mt-0.5">
                Seul un administrateur peut modifier ce statut.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
