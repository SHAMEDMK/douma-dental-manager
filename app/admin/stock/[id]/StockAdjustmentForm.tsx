'use client'

import { updateStock } from '@/app/actions/stock'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function StockAdjustmentForm({ productId, currentStock }: { productId: string, currentStock: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    
    try {
      const operation = formData.get('operation') as 'ADD' | 'REMOVE' | 'SET'
      const quantity = parseFloat(formData.get('quantity') as string)
      const reason = formData.get('reason') as string

      if (isNaN(quantity) || quantity < 0) {
        throw new Error('Quantité invalide')
      }

      await updateStock(productId, operation, quantity, reason)
      router.refresh()
      // Optionally redirect or show success
      router.push('/admin/stock')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Type d'opération</label>
        <select name="operation" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
          <option value="ADD">Approvisionnement (+)</option>
          <option value="REMOVE">Sortie / Perte (-)</option>
          <option value="SET">Inventaire (Définir la quantité)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Quantité</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="number"
            name="quantity"
            min="0"
            step="1"
            required
            className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            placeholder="0"
          />
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Stock actuel : {currentStock}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Raison / Référence</label>
        <input
          type="text"
          name="reason"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Ex: Livraison fournisseur, Casse, Inventaire annuel..."
        />
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? 'Mise à jour...' : 'Confirmer'}
        </button>
      </div>
    </form>
  )
}
