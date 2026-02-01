'use client'

import { createProductAction } from '@/app/actions/product'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateProductForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()

      // Ensure the URL is relative (starts with /uploads/)
      const uploadedUrl = data.url
      if (!uploadedUrl.startsWith('/uploads/') && !uploadedUrl.startsWith('http')) {
        throw new Error('URL invalide retournée par le serveur')
      }

      setImageUrl(uploadedUrl)
      console.log('Image uploadée avec succès:', uploadedUrl)
    } catch (err: any) {
      console.error('Erreur upload:', err)
      setUploadError(err.message || 'Erreur lors de l\'upload')
      // Reset file input on error
      e.target.value = ''
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)

    // Set imageUrl if uploaded
    if (imageUrl) {
      formData.set('imageUrl', imageUrl)
    }

    const result = await createProductAction(formData)

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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Ex: Implant Titane"
        />
      </div>

      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
          Référence / SKU
        </label>
        <input
          type="text"
          id="sku"
          name="sku"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Ex: PROD-001"
          aria-describedby={error === 'Ce SKU est déjà utilisé par un autre produit.' ? 'sku-error' : 'sku-help'}
        />
        {error === 'Ce SKU est déjà utilisé par un autre produit.' ? (
          <p id="sku-error" className="mt-1 text-sm text-red-600" role="alert">{error}</p>
        ) : (
          <p id="sku-help" className="mt-0.5 text-xs text-gray-500">Optionnel, unique par produit</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Ex: Implantologie"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prix par segment (Dh)
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="priceLabo" className="block text-xs font-medium text-gray-600 mb-1">
              Prix HT LABO <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="priceLabo"
              name="priceLabo"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="priceDentiste" className="block text-xs font-medium text-gray-600 mb-1">
              Prix HT DENTISTE
            </label>
            <input
              type="number"
              id="priceDentiste"
              name="priceDentiste"
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="priceRevendeur" className="block text-xs font-medium text-gray-600 mb-1">
              Prix HT REVENDEUR
            </label>
            <input
              type="number"
              id="priceRevendeur"
              name="priceRevendeur"
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Le prix HT LABO est requis. Les autres prix sont optionnels et utiliseront le prix HT LABO par défaut.
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
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-gray-500"
          placeholder="Rempli automatiquement"
        />
      </div>

      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
          Coût d'achat HT (Dh)
        </label>
        <input
          type="number"
          id="cost"
          name="cost"
          step="0.01"
          min="0"
          defaultValue="0"
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
            Stock initial <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="stock"
            name="stock"
            min="0"
            step="1"
            required
            defaultValue="0"
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
            defaultValue="5"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Image du produit
        </label>
        
        {/* File Upload */}
        <div className="mb-3">
          <label htmlFor="imageFile" className="block text-xs font-medium text-gray-600 mb-1">
            Uploader une image
          </label>
          <input
            type="file"
            id="imageFile"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileUpload}
            disabled={isUploading || isSubmitting}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {isUploading && (
            <p className="mt-1 text-xs text-blue-600">Upload en cours...</p>
          )}
          {uploadError && (
            <p className="mt-1 text-xs text-red-600">{uploadError}</p>
          )}
          {imageUrl && (
            <div className="mt-2">
              <p className="text-xs text-green-600 mb-1">✓ Image uploadée avec succès</p>
              <img src={imageUrl} alt="Preview" className="max-w-xs max-h-32 object-contain border border-gray-200 rounded" />
            </div>
          )}
        </div>

        {/* Or URL input */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-gray-500">OU</span>
          </div>
        </div>

        <div className="mt-3">
          <label htmlFor="imageUrl" className="block text-xs font-medium text-gray-600 mb-1">
            Entrer une URL d'image (http://, https:// ou /uploads/)
          </label>
          <input
            type="text"
            id="imageUrl"
            name="imageUrl"
            value={imageUrl}
            onChange={(e) => {
              const value = e.target.value
              // Reject Windows file paths immediately
              if (value.includes('\\') || value.match(/^[A-Z]:\\/)) {
                setUploadError('⚠️ Les chemins de fichiers locaux (C:\\...) ne sont pas autorisés. Utilisez le bouton "Uploader une image" ci-dessus.')
                return
              }
              // Only allow URLs starting with http://, https://, or /uploads/
              if (!value || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/uploads/')) {
                setImageUrl(value)
                setUploadError(null)
              } else {
                setImageUrl(value)
                setUploadError(null)
              }
            }}
            onPaste={(e) => {
              // Check pasted content for Windows paths
              const pastedText = e.clipboardData.getData('text')
              if (pastedText.includes('\\') || pastedText.match(/^[A-Z]:\\/)) {
                e.preventDefault()
                setUploadError('⚠️ Les chemins de fichiers locaux ne peuvent pas être collés. Utilisez le bouton "Uploader une image" ci-dessus.')
              }
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            placeholder="https://example.com/image.jpg ou /uploads/products/..."
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            ⚠️ Ne pas utiliser de chemins de fichiers locaux (C:\...). Utilisez l'upload ou une URL web.
          </p>
        </div>
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
          {isSubmitting ? 'Création...' : 'Créer le produit'}
        </button>
      </div>
    </form>
  )
}

