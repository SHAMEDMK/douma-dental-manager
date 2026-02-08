'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import {
  createProductOptionAction,
  addProductOptionValueAction,
  deleteProductOptionValueAction,
  deleteProductOptionAction,
} from '@/app/actions/product'

type OptionWithValues = {
  id: string
  name: string
  values: Array<{ id: string; value: string }>
}

type ProductOptionsManagerProps = {
  productId: string
  options: OptionWithValues[]
}

export default function ProductOptionsManager({ productId, options: initialOptions }: ProductOptionsManagerProps) {
  const router = useRouter()
  const [options, setOptions] = useState(initialOptions)
  const [newOptionName, setNewOptionName] = useState('')
  const [newValueByOptionId, setNewValueByOptionId] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newOptionName.trim()
    if (!name) return
    setError(null)
    setLoading('option')
    const result = await createProductOptionAction(productId, name)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
    } else {
      setNewOptionName('')
      router.refresh()
    }
  }

  const handleAddValue = async (optionId: string, e: React.FormEvent) => {
    e.preventDefault()
    const value = (newValueByOptionId[optionId] ?? '').trim()
    if (!value) return
    setError(null)
    setLoading(optionId)
    const result = await addProductOptionValueAction(optionId, value)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
    } else {
      setNewValueByOptionId((prev) => ({ ...prev, [optionId]: '' }))
      router.refresh()
    }
  }

  const handleDeleteValue = async (optionValueId: string) => {
    if (!window.confirm('Supprimer cette valeur ?')) return
    setError(null)
    setLoading(optionValueId)
    const result = await deleteProductOptionValueAction(optionValueId)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  const handleDeleteOption = async (optionId: string, optionName: string) => {
    if (!window.confirm(`Supprimer l\'option « ${optionName} » et toutes ses valeurs ?`)) return
    setError(null)
    setLoading(optionId)
    const result = await deleteProductOptionAction(optionId)
    setLoading(null)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-base font-semibold text-gray-900 mb-3">Ajouter une option</h3>
        <p className="text-sm text-gray-500 mb-3">
          Exemple : Teinte, Dimension, Taille. Les valeurs (ex. Blanc, A, 12) s’ajoutent après création.
        </p>
        <form onSubmit={handleCreateOption} className="flex gap-2 flex-wrap items-end">
          <div className="min-w-[200px]">
            <label htmlFor="new-option-name" className="block text-xs font-medium text-gray-600 mb-1">
              Nom de l’option
            </label>
            <input
              id="new-option-name"
              type="text"
              value={newOptionName}
              onChange={(e) => setNewOptionName(e.target.value)}
              placeholder="Ex: Teinte"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!newOptionName.trim() || loading === 'option'}
            className="inline-flex items-center gap-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {loading === 'option' ? 'Ajout…' : 'Créer l’option'}
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Options et valeurs</h3>
        {options?.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune option. Créez-en une ci‑dessus (ex. Teinte, Dimension).</p>
        ) : (
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white overflow-hidden">
            {options.map((opt) => (
              <li key={opt.id} className="p-4">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="font-medium text-gray-900">{opt.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteOption(opt.id, opt.name)}
                    disabled={loading === opt.id}
                    title="Supprimer l’option et toutes ses valeurs (impossible si des variantes les utilisent)"
                    className="text-red-600 hover:text-red-800 disabled:opacity-50 inline-flex items-center gap-1 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer l’option
                  </button>
                </div>
                <ul className="flex flex-wrap gap-2 mb-3">
                  {(opt.values ?? []).map((v) => (
                    <li
                      key={v.id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-sm text-gray-800"
                    >
                      {v.value}
                      <button
                        type="button"
                        onClick={() => handleDeleteValue(v.id)}
                        disabled={loading === v.id}
                        className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                        aria-label={`Supprimer ${v.value}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  onSubmit={(e) => handleAddValue(opt.id, e)}
                  className="flex gap-2 items-center"
                >
                  <input
                    type="text"
                    value={newValueByOptionId[opt.id] ?? ''}
                    onChange={(e) =>
                      setNewValueByOptionId((prev) => ({ ...prev, [opt.id]: e.target.value }))
                    }
                    placeholder={`Ajouter une valeur pour ${opt.name}…`}
                    className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!(newValueByOptionId[opt.id] ?? '').trim() || loading === opt.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
