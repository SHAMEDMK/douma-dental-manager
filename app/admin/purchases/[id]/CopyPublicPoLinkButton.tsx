'use client'

import { useState } from 'react'
import { Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getPurchaseOrderPublicShareUrlAction } from '@/app/actions/purchases'

type Props = {
  purchaseOrderId: string
}

export default function CopyPublicPoLinkButton({ purchaseOrderId }: Props) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    setLoading(true)
    try {
      const result = await getPurchaseOrderPublicShareUrlAction(purchaseOrderId)
      if (result.error || !result.url) {
        toast.error(result.error || 'Impossible de générer le lien')
        return
      }
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      toast.success('Lien copié dans le presse-papiers')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier le lien')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50"
      title="Lien public signé (90 jours) pour le fournisseur"
    >
      <Link2 className="w-4 h-4" aria-hidden />
      {loading ? 'Génération…' : copied ? 'Copié !' : 'Copier lien fournisseur'}
    </button>
  )
}
