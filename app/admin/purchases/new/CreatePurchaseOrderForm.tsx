'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Minus, Search, ClipboardList } from 'lucide-react'
import { getPurchaseCatalogUnits } from '@/app/actions/product'
import { createPurchaseOrderAction } from '@/app/actions/purchases'
import toast from 'react-hot-toast'

const MAX_PURCHASE_QTY = 999_999

type CatalogUnit = {
  id: string
  productId: string
  productVariantId?: string
  name: string
  sku?: string | null
  stock: number
  unitCost: number
}

type SupplierOption = {
  id: string
  code: string
  name: string
  isActive: boolean
}

type DraftLine = {
  productId: string
  productVariantId: string | null
  quantity: number
  name: string
  sku?: string | null
  unitCost: number
}

function lineKey(line: DraftLine): string {
  return `${line.productId}:${line.productVariantId ?? 'p'}`
}

type Props = {
  suppliers: SupplierOption[]
}

export default function CreatePurchaseOrderForm({ suppliers }: Props) {
  const router = useRouter()
  const [units, setUnits] = useState<CatalogUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const result = await getPurchaseCatalogUnits()
      if (cancelled) return
      if (result.error) {
        setError(result.error)
      } else if (result.products) {
        setUnits(result.products as CatalogUnit[])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const q = searchQuery.toLowerCase().trim()
  const filteredUnits = units.filter((u) => {
    if (!q) return true
    const nameMatch = u.name.toLowerCase().includes(q)
    const skuMatch = u.sku?.toLowerCase().includes(q)
    return nameMatch || skuMatch
  })

  const addLine = (unit: CatalogUnit, qty: number = 1) => {
    const productVariantId = unit.productVariantId ?? null
    const key = `${unit.productId}:${productVariantId ?? 'p'}`
    const existing = lines.find((l) => lineKey(l) === key)
    if (existing) {
      setLines(
        lines.map((l) =>
          lineKey(l) === key
            ? { ...l, quantity: Math.min(l.quantity + qty, MAX_PURCHASE_QTY) }
            : l
        )
      )
    } else {
      setLines([
        ...lines,
        {
          productId: unit.productId,
          productVariantId,
          quantity: Math.min(Math.max(1, qty), MAX_PURCHASE_QTY),
          name: unit.name,
          sku: unit.sku ?? null,
          unitCost: unit.unitCost,
        },
      ])
    }
  }

  const removeLine = (key: string) => {
    setLines(lines.filter((l) => lineKey(l) !== key))
  }

  const updateQty = (key: string, qty: number) => {
    if (qty < 1) {
      removeLine(key)
      return
    }
    setLines(
      lines.map((l) => {
        if (lineKey(l) !== key) return l
        return { ...l, quantity: Math.min(Math.max(1, qty), MAX_PURCHASE_QTY) }
      })
    )
  }

  const updateUnitCost = (key: string, raw: string) => {
    const v = parseFloat(raw.replace(',', '.'))
    const unitCost = Number.isFinite(v) ? Math.max(0, v) : 0
    setLines(
      lines.map((l) => (lineKey(l) === key ? { ...l, unitCost } : l))
    )
  }

  const totalHT = lines.reduce((s, l) => s + l.unitCost * l.quantity, 0)

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error('Sélectionnez un fournisseur.')
      return
    }
    if (lines.length === 0) {
      toast.error('Ajoutez au moins une ligne.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    const result = await createPurchaseOrderAction(
      supplierId,
      lines.map((l) => ({
        productId: l.productId,
        productVariantId: l.productVariantId,
        quantityOrdered: l.quantity,
        unitCost: l.unitCost,
      }))
    )
    if (result.error) {
      toast.error(result.error)
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    toast.success('Commande fournisseur créée (brouillon).')
    if (result.purchaseOrderId) {
      router.push(`/admin/purchases/${result.purchaseOrderId}`)
    } else {
      router.push('/admin/purchases')
    }
    router.refresh()
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 mb-1">
          Fournisseur
        </label>
        <select
          id="supplier"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          disabled={isSubmitting}
          className="w-full max-w-xl border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">— Choisir un fournisseur —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.name}
              {!s.isActive ? ' (Inactif)' : ''}
            </option>
          ))}
        </select>
      </div>

      {error && !isSubmitting && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement du catalogue…</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit (nom, SKU)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Catalogue (coût d&apos;achat)</h2>
              <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
                {filteredUnits.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit dans le catalogue'}
                  </p>
                ) : (
                  filteredUnits.map((unit) => {
                    const key = `${unit.productId}:${unit.productVariantId ?? 'p'}`
                    const inCart = lines.find((l) => lineKey(l) === key)
                    const currentQty = inCart?.quantity ?? 0
                    return (
                      <div
                        key={unit.id}
                        className="flex items-center justify-between p-3 border border-gray-100 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {unit.sku && (
                              <span className="font-mono text-gray-600 mr-1.5">{unit.sku}</span>
                            )}
                            {unit.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock : {unit.stock} · Coût suggéré : {unit.unitCost.toFixed(2)} Dh HT
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(key, currentQty - 1)}
                            disabled={isSubmitting || currentQty <= 0}
                            className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm">{currentQty}</span>
                          <button
                            type="button"
                            onClick={() => addLine(unit, 1)}
                            disabled={isSubmitting || currentQty >= MAX_PURCHASE_QTY}
                            className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Lignes ({lines.length})
              </h2>
              <div className="border border-gray-200 rounded-md p-3 max-h-96 overflow-y-auto space-y-2">
                {lines.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Ajoutez des produits depuis le catalogue.
                  </p>
                ) : (
                  lines.map((line) => (
                    <div
                      key={lineKey(line)}
                      className="flex flex-col gap-2 py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {line.sku && (
                              <span className="font-mono text-gray-600 mr-1.5">{line.sku}</span>
                            )}
                            {line.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-600">
                            <span>Qté</span>
                            <button
                              type="button"
                              onClick={() => updateQty(lineKey(line), line.quantity - 1)}
                              disabled={isSubmitting}
                              className="p-1 rounded border hover:bg-gray-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={MAX_PURCHASE_QTY}
                              value={line.quantity}
                              onChange={(e) =>
                                updateQty(lineKey(line), parseInt(e.target.value, 10) || 1)
                              }
                              className="w-16 text-center border border-gray-300 rounded py-1 text-sm"
                              disabled={isSubmitting}
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(lineKey(line), line.quantity + 1)}
                              disabled={isSubmitting || line.quantity >= MAX_PURCHASE_QTY}
                              className="p-1 rounded border hover:bg-gray-100 disabled:opacity-50"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <span className="ml-2">Coût unit. HT (Dh)</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={line.unitCost}
                              onChange={(e) => updateUnitCost(lineKey(line), e.target.value)}
                              disabled={isSubmitting}
                              className="w-24 border border-gray-300 rounded py-1 px-1 text-sm"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(lineKey(line))}
                          disabled={isSubmitting}
                          className="p-1 rounded text-red-600 hover:bg-red-50 flex-shrink-0"
                          title="Retirer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 text-right">
                        Ligne : {(line.unitCost * line.quantity).toFixed(2)} Dh HT
                      </div>
                    </div>
                  ))
                )}
              </div>
              {lines.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Total HT (indicatif)</span>
                    <span>{totalHT.toFixed(2)} Dh</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="mt-4 w-full py-2 px-4 bg-blue-900 text-white rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enregistrement…' : 'Créer la commande (brouillon)'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
