'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

export default function MagasinierStockSuccessBanner() {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/magasinier/stock', { scroll: false })
    }, 3000)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded flex items-center">
      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
      <p className="text-sm text-green-700 font-medium">Stock mis à jour.</p>
    </div>
  )
}
