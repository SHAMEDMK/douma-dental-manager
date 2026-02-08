'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

type VariantSuccessBannerProps = {
  variant?: string
  productId: string
}

export default function VariantSuccessBanner({ variant, productId }: VariantSuccessBannerProps) {
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(`/admin/products/${productId}/variants`, { scroll: false })
    }, 3000)
    return () => clearTimeout(t)
  }, [router, productId])

  const message = variant === 'updated' ? 'Variante mise à jour.' : 'Variante créée.'

  return (
    <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-4 rounded flex items-center">
      <CheckCircle className="h-5 w-5 text-green-500 mr-2 shrink-0" />
      <p className="text-sm text-green-700 font-medium">{message}</p>
    </div>
  )
}
