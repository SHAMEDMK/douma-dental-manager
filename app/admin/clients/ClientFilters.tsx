'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [segment, setSegment] = useState(searchParams.get('segment') || '')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()

    if (segment) params.set('segment', segment)
    if (searchQuery) params.set('q', searchQuery)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    startTransition(() => {
      router.push(`/admin/clients?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setSegment('')
    setSearchQuery('')
    setDateFrom('')
    setDateTo('')
    startTransition(() => {
      router.push('/admin/clients')
    })
  }

  const hasFilters = segment || searchQuery || dateFrom || dateTo

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Segment
          </label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          >
            <option value="">Tous les segments</option>
            <option value="LABO">LABO</option>
            <option value="DENTISTE">DENTISTE</option>
            <option value="REVENDEUR">REVENDEUR</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recherche
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nom, email, entreprise..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date début
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date fin
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={applyFilters}
          disabled={isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
        >
          {isPending ? 'Application...' : 'Appliquer les filtres'}
        </button>
        {hasFilters && (
          <button
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
