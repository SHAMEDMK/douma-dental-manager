'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Loader2 } from 'lucide-react'
import { bulkCreateVariantsAction } from '@/app/actions/product'

const CSV_EXAMPLE = `SKU;Nom;Stock;Stock min;Prix LABO
PROD-T1;Teinte 1;10;5;25.00
PROD-T2;Teinte 2;20;5;26.50`

type BulkVariantsImportProps = {
  productId: string
}

export default function BulkVariantsImport({ productId }: BulkVariantsImportProps) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleImport() {
    if (!text.trim()) {
      setMessage({ type: 'error', text: 'Collez au moins une ligne (SKU; Nom; Stock; Stock min; Prix LABO).' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const result = await bulkCreateVariantsAction(productId, text)
      if (result?.error) {
        setMessage({ type: 'error', text: result.error })
      } else if (result?.success) {
        setMessage({
          type: 'success',
          text: `${result.created} variante(s) créée(s).${result.errors?.length ? ` Erreurs : ${result.errors.slice(0, 3).join(' ')}` : ''}`,
        })
        setText('')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-8 p-4 rounded-lg border border-gray-200 bg-gray-50/50">
      <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4" />
        Import en masse
      </h3>
      <p className="text-xs text-gray-600 mb-2">
        Une ligne par variante. Colonnes : <strong>SKU</strong> ; Nom ; Stock ; Stock min ; Prix LABO (optionnel). Séparateur <strong>;</strong> ou <strong>,</strong>. La première ligne peut être un en-tête (SKU, Nom, …).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={CSV_EXAMPLE}
        rows={5}
        className="w-full rounded-md border-gray-300 shadow-sm text-sm font-mono mb-2"
        disabled={loading}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleImport}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Importer les variantes
        </button>
        {message && (
          <span className={message.type === 'success' ? 'text-green-700 text-sm' : 'text-red-700 text-sm'}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  )
}
