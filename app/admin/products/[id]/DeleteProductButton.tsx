'use client'

import { deleteProductAction } from '@/app/actions/product'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function DeleteProductButton({ productId, productName }: { productId: string; productName: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showForceConfirm, setShowForceConfirm] = useState(false)
  const [orderLinesCount, setOrderLinesCount] = useState<number | null>(null)

  const handleDelete = async (force?: boolean) => {
    if (!showConfirm && !showForceConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteProductAction(productId, force ?? false)

      if (result.error) {
        if ('usedInOrders' in result && result.usedInOrders) {
          setOrderLinesCount(result.usedInOrders as number)
          setShowConfirm(false)
          setShowForceConfirm(true)
        } else {
          toast.error(result.error)
          setShowConfirm(false)
        }
      } else {
        toast.success('Produit supprimé avec succès')
        router.push('/admin/products')
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
      setShowConfirm(false)
      setShowForceConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (showForceConfirm) {
    return (
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-900 mb-2">
          Ce produit est utilisé dans <strong>{orderLinesCount ?? '?'} ligne(s) de commande</strong>.
        </p>
        <p className="text-sm text-amber-800 mb-3">
          Voulez-vous <strong>supprimer ces lignes des commandes</strong> puis supprimer le produit <strong>{productName}</strong> ? Les commandes concernées perdront ces lignes. Cette action est irréversible.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleDelete(true)}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer quand même'}
          </button>
          <button
            onClick={() => { setShowForceConfirm(false); setShowConfirm(false) }}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  if (showConfirm) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800 mb-3">
          Êtes-vous sûr de vouloir supprimer le produit <strong>{productName}</strong> ? Cette action est irréversible.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleDelete(false)}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {isDeleting ? 'Suppression...' : 'Confirmer la suppression'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={isDeleting}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => handleDelete()}
      disabled={isDeleting}
      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Supprimer le produit
    </button>
  )
}
