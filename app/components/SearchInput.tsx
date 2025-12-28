'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

export default function SearchInput({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams()
  const { replace } = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams)
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }
    params.set('page', '1') // Reset pagination

    startTransition(() => {
      replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={searchParams.get('q')?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        className="border border-gray-300 rounded-md pl-4 pr-10 py-2 focus:ring-blue-500 focus:border-blue-500 w-full"
      />
      {isPending && (
        <div className="absolute right-3 top-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900"></div>
        </div>
      )}
    </div>
  )
}
