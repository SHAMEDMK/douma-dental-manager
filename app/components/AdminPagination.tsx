'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export type AdminPaginationProps = {
  totalPages: number
  totalCount?: number
  /** Libellé pour "N éléments au total" : { singular: "facture", plural: "factures" } */
  itemLabel?: { singular: string; plural: string }
}

/**
 * Pagination admin standardisée : Page X sur Y, N éléments au total, boutons Précédent/Suivant.
 * Préserve tous les query params existants.
 */
export default function AdminPagination({
  totalPages,
  totalCount,
  itemLabel,
}: AdminPaginationProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const currentPage = Number(searchParams.get('page')) || 1

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  const showSummary = totalCount != null && totalCount > 0
  const showNav = totalPages > 1

  const summaryText = showSummary && itemLabel
    ? `${totalCount} ${totalCount > 1 ? itemLabel.plural : itemLabel.singular} au total`
    : null

  if (!showSummary && !showNav) return null

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50">
      <div className="text-sm text-gray-600">
        Page {currentPage} sur {totalPages}
        {summaryText != null && (
          <span className="text-gray-500"> — {summaryText}</span>
        )}
      </div>
      {showNav && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => replace(createPageURL(currentPage - 1))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Précédent
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => replace(createPageURL(currentPage + 1))}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
