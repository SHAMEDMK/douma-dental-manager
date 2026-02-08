'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, Loader2 } from 'lucide-react'
import { generateVariantsFromOptionsAction } from '@/app/actions/product'

type GenerateVariantsFromOptionsProps = {
  productId: string
  hasOptions: boolean
  optionsSummary?: string
}

export default function GenerateVariantsFromOptions({
  productId,
  hasOptions,
  optionsSummary,
}: GenerateVariantsFromOptionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [defaultStock, setDefaultStock] = useState(0)
  const [defaultMinStock, setDefaultMinStock] = useState(5)

  async function handleGenerate() {
    setLoading(true)
    setMessage(null)
    try {
      const result = await generateVariantsFromOptionsAction(productId, defaultStock, defaultMinStock)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else if (result?.success) {
        setMessage({
          type: 'success',
          text: `${result.created} variante(s) créée(s).${result.skipped ? ` ${result.skipped} ignorée(s) (déjà existantes).` : ''}`,
        })
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (!hasOptions) {
    return (
      <div className="mb-8 p-4 rounded-lg border border-amber-200 bg-amber-50/50">
        <p className="text-sm text-amber-800">
          Pour générer les variantes automatiquement, définissez d’abord des <strong>options</strong> (ex. Teinte, Taille) et leurs valeurs dans l’onglet <strong>Options</strong>. Ensuite revenez ici et cliquez sur « Générer les variantes ».
        </p>
      </div>
    )
  }

  return (
    <div className="mb-8 p-4 rounded-lg border border-gray-200 bg-gray-50/50">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Layers className="w-4 h-4" />
        Générer les variantes à partir des options
      </h3>
      {optionsSummary && (
        <p className="text-xs text-gray-600 mb-3">{optionsSummary}</p>
      )}
      <p className="text-xs text-gray-600 mb-3">
        Crée une variante pour chaque combinaison (ex. Teinte A1 × Taille S, A1 × M, …). SKU et nom sont générés automatiquement.
      </p>
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Stock initial par variante</span>
          <input
            type="number"
            min={0}
            value={defaultStock}
            onChange={(e) => setDefaultStock(parseInt(e.target.value, 10) || 0)}
            className="w-24 rounded border-gray-300 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Stock minimum</span>
          <input
            type="number"
            min={0}
            value={defaultMinStock}
            onChange={(e) => setDefaultMinStock(parseInt(e.target.value, 10) || 5)}
            className="w-24 rounded border-gray-300 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Générer les variantes
        </button>
      </div>
      {message && (
        <p className={message.type === 'success' ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
          {message.text}
        </p>
      )}
    </div>
  )
}
