'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function InvoiceFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [clientQuery, setClientQuery] = useState(searchParams.get('client') || '')
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()

    if (status) params.set('status', status)
    if (clientQuery) params.set('client', clientQuery)
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)

    startTransition(() => {
      router.push(`/admin/invoices?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setStatus('')
    setClientQuery('')
    setDateFrom('')
    setDateTo('')
    startTransition(() => {
      router.push('/admin/invoices')
    })
  }

  const hasFilters = status || clientQuery || dateFrom || dateTo

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Statut
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            disabled={isPending}
          >
            <option value="">Tous les statuts</option>
            <option value="UNPAID">Impayée</option>
            <option value="PARTIAL">Partiellement payée</option>
            <option value="PAID">Payée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client
          </label>
          <input
            type="text"
            value={clientQuery}
            onChange={(e) => setClientQuery(e.target.value)}
            placeholder="Nom ou email..."
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
