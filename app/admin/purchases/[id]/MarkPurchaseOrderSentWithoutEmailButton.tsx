'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { markPurchaseOrderSentWithoutEmailAction } from '@/app/actions/purchases'
import toast from 'react-hot-toast'

type Props = {
  purchaseOrderId: string
  visible: boolean
}

export default function MarkPurchaseOrderSentWithoutEmailButton({
  purchaseOrderId,
  visible,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  if (!visible) return null

  const handleClick = async () => {
    if (
      !window.confirm(
        'Passer cette commande en statut « Envoyée » sans envoyer d’e-mail au fournisseur ?'
      )
    ) {
      return
    }
    setLoading(true)
    const result = await markPurchaseOrderSentWithoutEmailAction(purchaseOrderId)
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
      return
    }
    toast.success('Commande marquée comme envoyée.')
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Utile si l’e-mail automatique n’est pas encore configuré (Resend)"
    >
      <CheckCircle className="w-4 h-4" aria-hidden />
      {loading ? 'Mise à jour…' : 'Marquer comme envoyée (sans e-mail)'}
    </button>
  )
}
