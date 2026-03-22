'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { sendPurchaseOrderAction } from '@/app/actions/purchases'
import toast from 'react-hot-toast'

type Props = {
  purchaseOrderId: string
  visible: boolean
}

export default function SendPurchaseOrderButton({ purchaseOrderId, visible }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!visible) return null

  const handleClick = async () => {
    if (
      !window.confirm(
        'Passer la commande au statut « Envoyée » et enregistrer la date d’envoi ?'
      )
    ) {
      return
    }
    setLoading(true)
    const result = await sendPurchaseOrderAction(purchaseOrderId)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    toast.success('Commande passée en « Envoyée ».')
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send className="w-4 h-4" aria-hidden />
      {loading ? 'Envoi…' : 'Envoyer'}
    </button>
  )
}
