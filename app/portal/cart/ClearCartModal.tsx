'use client'

import { useState } from 'react'

type ClearCartModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ClearCartModal({ isOpen, onClose, onConfirm }: ClearCartModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Vider le panier
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Êtes-vous sûr de vouloir vider votre panier ? Cette action est irréversible.
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
              Vider le panier
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

