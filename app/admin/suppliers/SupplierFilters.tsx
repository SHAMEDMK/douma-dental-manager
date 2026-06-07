'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function SupplierFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    params.set('page', '1')
    if (searchQuery.trim()) params.set('q', searchQuery.trim())
    startTransition(() => {
      router.push(`/admin/suppliers?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    startTransition(() => {
      router.push('/admin/suppliers')
    })
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recherche
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Code, nom, email, ville..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={applyFilters}
            disabled={isPending}
            className="px-4 py-2 bg-shamed-navy text-white rounded-md hover:bg-shamed-navy/90 disabled:opacity-50 text-sm font-medium"
          >
            {isPending ? 'Recherche...' : 'Rechercher'}
          </button>
          {searchQuery && (
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
    </div>
  )
}
