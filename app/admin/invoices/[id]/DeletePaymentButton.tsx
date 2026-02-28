'use client'

import { deletePaymentAction } from '@/app/actions/admin-payments'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }
    setIsDeleting(true)
    try {
      const result = await deletePaymentAction(paymentId)
      if (result.error) {
        toast.error(result.error)
        setIsDeleting(false)
        return
      }
      toast.success('Paiement supprimé')
      setShowConfirm(false)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {isDeleting ? 'Suppression...' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={() => setShowConfirm(false)}
          disabled={isDeleting}
          className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
        >
          Annuler
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-xs text-red-600 hover:text-red-800 hover:underline"
      data-testid="delete-payment-btn"
    >
      Supprimer
    </button>
  )
}
