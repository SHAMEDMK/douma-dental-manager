'use client'

import { deleteInvoiceAction } from '@/app/actions/admin-payments'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
}: {
  invoiceId: string
  invoiceNumber: string | null
}) {
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
      const result = await deleteInvoiceAction(invoiceId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Facture supprimée')
        router.push('/admin/invoices')
        router.refresh()
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la suppression')
    } finally {
      setIsDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800 mb-3">
          Supprimer la facture <strong>{invoiceNumber || invoiceId}</strong> ? Les paiements associés seront aussi supprimés. La commande restera sans facture. Cette action est irréversible.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
          >
            {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md border border-red-200"
    >
      <Trash2 className="h-4 w-4" />
      Supprimer la facture
    </button>
  )
}
