'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function ComptableOrderFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [clientFilter, setClientFilter] = useState(searchParams.get('client') || '')
  const [dateFromFilter, setDateFromFilter] = useState(searchParams.get('dateFrom') || '')
  const [dateToFilter, setDateToFilter] = useState(searchParams.get('dateTo') || '')

  const applyFilters = () => {
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (clientFilter) params.set('client', clientFilter)
    if (dateFromFilter) params.set('dateFrom', dateFromFilter)
    if (dateToFilter) params.set('dateTo', dateToFilter)
    router.push(`/comptable/orders?${params.toString()}`)
  }

  return (
    <div className="bg-white shadow rounded-lg p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md"
          >
            <option value="all">Tous les statuts</option>
            <option value="CONFIRMED">Confirmée</option>
            <option value="PREPARED">Préparée</option>
            <option value="SHIPPED">Expédiée</option>
            <option value="DELIVERED">Livrée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Client</label>
          <input
            type="text"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            placeholder="Nom, email..."
            className="w-full text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date début</label>
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date fin</label>
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            className="w-full text-sm border-gray-300 rounded-md"
          />
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={applyFilters}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          Appliquer les filtres
        </button>
      </div>
    </div>
  )
}
