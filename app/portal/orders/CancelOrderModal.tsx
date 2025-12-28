'use client'

type CancelOrderModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  orderNumber: string
}

export default function CancelOrderModal({ isOpen, onClose, onConfirm, orderNumber }: CancelOrderModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Annuler la commande
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            Êtes-vous sûr de vouloir annuler la commande <strong>{orderNumber}</strong> ?
          </p>
          <p className="text-sm text-gray-600 mb-6">
            Le stock sera remis en disponibilité et cette action est irréversible.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Confirmer l'annulation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

