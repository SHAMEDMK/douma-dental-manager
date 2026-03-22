'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createPurchaseReceiptAction } from '@/app/actions/purchases'

export type ReceiptLineRow = {
  purchaseOrderItemId: string
  productLabel: string
  sku: string | null
  quantityOrdered: number
  quantityReceivedAlready: number
  remaining: number
}

type Props = {
  purchaseOrderId: string
  orderNumber: string
  lines: ReceiptLineRow[]
}

function parsePositiveIntInput(raw: string): { ok: true; value: number } | { ok: false; message: string } {
  const t = raw.trim()
  if (t === '') {
    return { ok: true, value: 0 }
  }
  const n = Number(t)
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, message: 'Saisissez un nombre entier pour chaque ligne.' }
  }
  if (n < 0) {
    return { ok: false, message: 'Les quantités ne peuvent pas être négatives.' }
  }
  return { ok: true, value: n }
}

export default function PurchaseReceiptForm({ purchaseOrderId, orderNumber, lines }: Props) {
  const router = useRouter()
  const [qtyByLineId, setQtyByLineId] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const line of lines) {
      init[line.purchaseOrderItemId] = ''
    }
    return init
  })
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const items: { purchaseOrderItemId: string; quantityReceived: number }[] = []

    for (const line of lines) {
      const raw = qtyByLineId[line.purchaseOrderItemId] ?? ''
      const parsed = parsePositiveIntInput(raw)
      if (!parsed.ok) {
        toast.error(parsed.message)
        return
      }
      if (parsed.value > line.remaining) {
        toast.error(
          `Quantité trop élevée pour « ${line.productLabel} » (reste : ${line.remaining}).`
        )
        return
      }
      if (parsed.value > 0) {
        items.push({ purchaseOrderItemId: line.purchaseOrderItemId, quantityReceived: parsed.value })
      }
    }

    if (items.length === 0) {
      toast.error('Indiquez au moins une quantité à réceptionner.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createPurchaseReceiptAction(purchaseOrderId, items)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Réception enregistrée pour ${orderNumber}.`)
      router.push(`/admin/purchases/${purchaseOrderId}`)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative z-0 mt-6 space-y-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quantités à réceptionner</h2>
          <p className="text-sm text-gray-500 mt-1">
            Saisissez uniquement les lignes reçues. Laisser vide si une ligne n&apos;est pas concernée
            par cette réception.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Article
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commandé
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Déjà reçu
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reste
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cette réception
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lines.map((line) => (
                <tr key={line.purchaseOrderItemId}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {line.sku && (
                      <span className="font-mono text-gray-600 mr-2">{line.sku}</span>
                    )}
                    {line.productLabel}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 tabular-nums">
                    {line.quantityOrdered}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600 tabular-nums">
                    {line.quantityReceivedAlready}
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900 tabular-nums">
                    {line.remaining}
                  </td>
                  <td className="px-6 py-4 text-sm text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={submitting}
                      value={qtyByLineId[line.purchaseOrderItemId] ?? ''}
                      onChange={(ev) => {
                        const id = line.purchaseOrderItemId
                        setQtyByLineId((prev) => ({ ...prev, [id]: ev.target.value }))
                      }}
                      className="w-28 rounded-md border border-gray-300 px-2 py-1.5 text-right tabular-nums text-gray-900 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Quantité à réceptionner pour ${line.productLabel}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Enregistrement…' : 'Valider la réception'}
        </button>
      </div>
    </form>
  )
}
