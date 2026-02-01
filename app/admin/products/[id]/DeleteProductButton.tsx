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

  const handleDelete = async () => {
    if (!showConfirm) {
      setShowConfirm(true)
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteProductAction(productId)
      
      if (result.error) {
        toast.error(result.error)
        setShowConfirm(false)
      } else {
        toast.success('Produit supprimé avec succès')
        router.push('/admin/products')
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression')
      setShowConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-800 mb-3">
          Êtes-vous sûr de vouloir supprimer le produit <strong>{productName}</strong> ? Cette action est irréversible.
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
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
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Supprimer le produit
    </button>
  )
}
