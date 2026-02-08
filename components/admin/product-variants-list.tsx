'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { deleteVariantAction } from '@/app/actions/product'
import type { ProductVariantDisplay } from '@/lib/types/product.types'

type SortKey = 'sku' | 'name' | 'stock' | 'priceLabo'

type ProductVariantsListProps = {
  variants: ProductVariantDisplay[]
  productId: string
  onEdit: (variant: ProductVariantDisplay) => void
  segmentLabels?: Record<string, string>
}

const defaultSegmentLabels: Record<string, string> = {
  LABO: 'Labo',
  DENTISTE: 'Dentiste',
  REVENDEUR: 'Revendeur',
}

export default function ProductVariantsList({
  variants,
  productId,
  onEdit,
  segmentLabels = defaultSegmentLabels,
}: ProductVariantsListProps) {
  const router = useRouter()
  const [sortKey, setSortKey] = useState<SortKey>('sku')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const perPage = 10

  const sortedVariants = useMemo(() => {
    const list = [...variants]
    list.sort((a, b) => {
      let aVal: string | number = a[sortKey] ?? ''
      let bVal: string | number = b[sortKey] ?? ''
      if (sortKey === 'stock' || sortKey === 'priceLabo') {
        aVal = Number(a[sortKey]) ?? 0
        bVal = Number(b[sortKey]) ?? 0
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal
      }
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [variants, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sortedVariants.length / perPage))
  const paginatedVariants = sortedVariants.slice(page * perPage, page * perPage + perPage)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPage(0)
  }

  const SortHeader = ({ label, sortKey: columnKey }: { label: string; sortKey: SortKey }) => (
    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
      <button
        type="button"
        onClick={() => toggleSort(columnKey)}
        className="inline-flex items-center gap-1 hover:text-gray-700"
      >
        {label}
        {sortKey === columnKey ? (sortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : null}
      </button>
    </th>
  )

  async function handleDelete(variantId: string) {
    setDeleteError(null)
    setDeletingId(variantId)
    try {
      const result = await deleteVariantAction(variantId)
      if (result?.error) {
        setDeleteError(result.error)
      } else {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  const priceDisplay = (v: ProductVariantDisplay) => {
    if (v.priceLabo != null || v.priceDentiste != null || v.priceRevendeur != null) {
      return [
        v.priceLabo != null && `${segmentLabels.LABO ?? 'Labo'}: ${v.priceLabo.toFixed(2)}`,
        v.priceDentiste != null && `${segmentLabels.DENTISTE ?? 'Dentiste'}: ${v.priceDentiste.toFixed(2)}`,
        v.priceRevendeur != null && `${segmentLabels.REVENDEUR ?? 'Revendeur'}: ${v.priceRevendeur.toFixed(2)}`,
      ]
        .filter(Boolean)
        .join(' · ')
    }
    return 'Hérité'
  }

  if (variants.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        Aucune variante. Créez-en une avec le formulaire ci‑dessus.
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
      {deleteError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700">
          {deleteError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader label="SKU" sortKey="sku" />
              <SortHeader label="Nom" sortKey="name" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attributs
              </th>
              <SortHeader label="Stock" sortKey="stock" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prix (segment)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Statut
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedVariants.map((v) => {
              const isLowStock = v.minStock > 0 && v.stock <= v.minStock
              const isOutOfStock = v.stock === 0
              const status = isOutOfStock ? 'Rupture' : isLowStock ? 'Stock bas' : 'En stock'
              const statusClass = isOutOfStock
                ? 'bg-red-100 text-red-800'
                : isLowStock
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-green-100 text-green-800'
              const optionLabels =
                v.optionValues?.map((ov) => `${ov.optionValue.option.name}: ${ov.optionValue.value}`).join(', ') ?? '-'
              return (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">{v.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{v.name ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{optionLabels}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    <span className={isLowStock ? 'font-medium text-amber-700' : ''}>{v.stock}</span>
                    {v.minStock > 0 && (
                      <span className="text-gray-400 text-xs ml-1">(min. {v.minStock})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{priceDisplay(v)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>
                      {status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                    <button
                      type="button"
                      onClick={() => onEdit(v)}
                      className="text-blue-600 hover:text-blue-900 mr-3 inline-flex items-center gap-1"
                    >
                      <Pencil className="w-4 h-4" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm('Supprimer cette variante ?') && handleDelete(v.id)}
                      disabled={deletingId === v.id}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingId === v.id ? 'Suppression…' : 'Supprimer'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {page * perPage + 1}-{Math.min((page + 1) * perPage, sortedVariants.length)} sur {sortedVariants.length}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
