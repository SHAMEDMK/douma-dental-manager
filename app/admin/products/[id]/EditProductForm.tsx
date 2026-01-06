'use client'

import { updateProductAction } from '@/app/actions/product'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  priceLabo: number | null
  priceDentiste: number | null
  priceRevendeur: number | null
  cost: number
  stock: number
  minStock: number
  category: string | null
  imageUrl: string | null
  segmentPrices?: Array<{
    segment: string
    price: number
  }>
}

export default function EditProductForm({ product }: { product: Product }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get prices from ProductPrice if available, otherwise fallback to legacy fields
  const getPriceForSegment = (segment: string): number | null => {
    if (product.segmentPrices && product.segmentPrices.length > 0) {
      const segmentPrice = product.segmentPrices.find(sp => sp.segment === segment)
      if (segmentPrice) return segmentPrice.price
    }
    // Fallback to legacy fields
    switch (segment) {
      case 'LABO': return product.priceLabo ?? product.price
      case 'DENTISTE': return product.priceDentiste
      case 'REVENDEUR': return product.priceRevendeur
      default: return null
    }
  }

  const priceLaboValue = getPriceForSegment('LABO') ?? product.price
  const priceDentisteValue = getPriceForSegment('DENTISTE')
  const priceRevendeurValue = getPriceForSegment('REVENDEUR')

  // Auto-fill legacy price field with priceLabo
  useEffect(() => {
    const priceLaboInput = document.getElementById('priceLabo') as HTMLInputElement
    const priceInput = document.getElementById('price') as HTMLInputElement
    if (priceLaboInput && priceInput) {
      const handleInput = () => {
        if (priceInput) {
          priceInput.value = priceLaboInput.value || ''
        }
      }
      priceLaboInput.addEventListener('input', handleInput)
      return () => priceLaboInput.removeEventListener('input', handleInput)
    }
  }, [])

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)

    const result = await updateProductAction(product.id, formData)

    if (result?.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      // Redirect is handled by the server action
      router.push('/admin/products')
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nom du produit <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={product.name}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Ex: Implant Titane"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={product.description || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Description du produit (optionnel)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
            Catégorie
          </label>
          <input
            type="text"
            id="category"
            name="category"
            defaultValue={product.category || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ex: Implantologie"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prix par segment (€)
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="priceLabo" className="block text-xs font-medium text-gray-600 mb-1">
              Prix LABO <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="priceLabo"
              name="priceLabo"
              step="0.01"
              min="0"
              required
              defaultValue={priceLaboValue}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="priceDentiste" className="block text-xs font-medium text-gray-600 mb-1">
              Prix DENTISTE
            </label>
            <input
              type="number"
              id="priceDentiste"
              name="priceDentiste"
              step="0.01"
              min="0"
              defaultValue={priceDentisteValue ?? ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="priceRevendeur" className="block text-xs font-medium text-gray-600 mb-1">
              Prix REVENDEUR
            </label>
            <input
              type="number"
              id="priceRevendeur"
              name="priceRevendeur"
              step="0.01"
              min="0"
              defaultValue={priceRevendeurValue ?? ''}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Le prix LABO est requis. Les autres prix sont optionnels et utiliseront le prix LABO par défaut.
        </p>
      </div>

      <div>
        <label htmlFor="price" className="block text-sm font-medium text-gray-700">
          Prix (legacy) <span className="text-gray-400 text-xs">(sera rempli automatiquement avec le prix LABO)</span>
        </label>
        <input
          type="number"
          id="price"
          name="price"
          step="0.01"
          min="0"
          readOnly
          defaultValue={priceLaboValue}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-500"
          placeholder="Rempli automatiquement"
        />
      </div>

      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
          Coût d'achat (€)
        </label>
        <input
          type="number"
          id="cost"
          name="cost"
          step="0.01"
          min="0"
          defaultValue={product.cost}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="0.00"
        />
        <p className="mt-1 text-xs text-gray-500">
          Coût d'achat du produit (utilisé pour le calcul de marge)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
            Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="stock"
            name="stock"
            min="0"
            step="1"
            required
            defaultValue={product.stock}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="minStock" className="block text-sm font-medium text-gray-700">
            Stock minimum <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="minStock"
            name="minStock"
            min="0"
            step="1"
            required
            defaultValue={product.minStock}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
          URL de l'image
        </label>
        <input
          type="url"
          id="imageUrl"
          name="imageUrl"
          defaultValue={product.imageUrl || ''}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Mise à jour...' : 'Mettre à jour'}
        </button>
      </div>
    </form>
  )
}

