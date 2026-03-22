'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban } from 'lucide-react'
import { cancelPurchaseOrderAction } from '@/app/actions/purchases'
import toast from 'react-hot-toast'

type Props = {
  purchaseOrderId: string
  visible: boolean
}

export default function CancelPurchaseOrderButton({ purchaseOrderId, visible }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!visible) return null

  const handleClick = async () => {
    if (
      !window.confirm(
        'ANNULER DÉFINITIVEMENT cette commande fournisseur ?\n\n' +
          'Cette action est irréversible. Seules les commandes sans réception peuvent être annulées.\n\n' +
          'Confirmer l’annulation ?'
      )
    ) {
      return
    }
    setLoading(true)
    const result = await cancelPurchaseOrderAction(purchaseOrderId)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    toast.success('Commande fournisseur annulée.')
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-red-300 text-red-800 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Ban className="w-4 h-4" aria-hidden />
      {loading ? 'Annulation…' : 'Annuler'}
    </button>
  )
}
