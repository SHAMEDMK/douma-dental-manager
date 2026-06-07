'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'SENT', label: 'Envoyée' },
  { value: 'PARTIALLY_RECEIVED', label: 'Part. réceptionnée' },
  { value: 'RECEIVED', label: 'Réceptionnée' },
  { value: 'CANCELLED', label: 'Annulée' },
]

type Props = {
  suppliers: { id: string; code: string; name: string; isActive: boolean }[]
}

export default function PurchaseFilters({ suppliers }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [supplierId, setSupplierId] = useState(searchParams.get('supplierId') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    params.set('page', '1')
    if (status) params.set('status', status)
    if (supplierId) params.set('supplierId', supplierId)
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    startTransition(() => {
      router.push(`/admin/purchases?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setStatus('')
    setSupplierId('')
    setSearchQuery('')
    startTransition(() => {
      router.push('/admin/purchases')
    })
  }

  const hasFilters = status || supplierId || searchQuery

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fournisseur</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          >
            <option value="">Tous les fournisseurs</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} — {s.name}
                {!s.isActive ? ' (inactif)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="N° PO, fournisseur..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={applyFilters}
          disabled={isPending}
          className="px-4 py-2 bg-shamed-navy text-white rounded-md hover:bg-shamed-navy/90 disabled:opacity-50 text-sm font-medium"
        >
          {isPending ? 'Application...' : 'Appliquer les filtres'}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            disabled={isPending}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm font-medium"
          >
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
