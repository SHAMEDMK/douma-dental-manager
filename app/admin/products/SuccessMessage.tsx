'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function SuccessMessage() {
  const router = useRouter()

  useEffect(() => {
    // Remove the query parameter after 3 seconds
    const timer = setTimeout(() => {
      router.replace('/admin/products', { scroll: false })
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded">
      <div className="flex items-center">
        <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
        <p className="text-sm text-green-700 font-medium">Produit mis à jour</p>
      </div>
    </div>
  )
}

