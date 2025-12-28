'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export default function Pagination({ totalPages }: { totalPages: number }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  
  const currentPage = Number(searchParams.get('page')) || 1

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex justify-center space-x-2 mt-8">
      <button
        disabled={currentPage <= 1}
        onClick={() => replace(createPageURL(currentPage - 1))}
        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
      >
        Précédent
      </button>
      <span className="px-4 py-2 text-gray-700">
        Page {currentPage} sur {totalPages}
      </span>
      <button
        disabled={currentPage >= totalPages}
        onClick={() => replace(createPageURL(currentPage + 1))}
        className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
      >
        Suivant
      </button>
    </div>
  )
}
