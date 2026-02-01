'use client'

import { useState } from 'react'
import { deleteAccountantAction } from '@/app/actions/admin'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface DeleteAccountantButtonProps {
  accountantId: string
  accountantName: string
  accountantEmail: string
}

export default function DeleteAccountantButton({ 
  accountantId, 
  accountantName,
  accountantEmail 
}: DeleteAccountantButtonProps) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const result = await deleteAccountantAction(accountantId)
      
      if (result.error) {
        toast.error(result.error)
        setIsDeleting(false)
        setShowModal(false)
      } else {
        toast.success(`Comptable ${accountantName} supprimé avec succès`)
        router.refresh()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur s\'est produite'
      toast.error(errorMessage)
      setIsDeleting(false)
      setShowModal(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Supprimer
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Supprimer le comptable
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Êtes-vous sûr de vouloir supprimer le comptable <strong>{accountantName}</strong> ({accountantEmail}) ?
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-3">
                  <p className="text-sm text-yellow-700">
                    <strong>⚠️ Attention :</strong> Cette action est irréversible. Le comptable perdra immédiatement l'accès à l'application.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
