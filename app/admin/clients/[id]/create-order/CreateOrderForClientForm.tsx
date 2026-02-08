'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Minus, Search, ShoppingCart } from 'lucide-react'
import { getAvailableProducts } from '@/app/actions/product'
import { createOrderAction } from '@/app/actions/order'
import toast from 'react-hot-toast'

type Unit = {
  id: string
  productId: string
  productVariantId?: string
  name: string
  sku?: string | null
  stock: number
  price: number
}

type DraftLine = {
  productId: string
  productVariantId: string | null
  quantity: number
  name: string
  sku?: string | null
  price: number
  maxQuantity: number
}

type CreateOrderForClientFormProps = {
  clientId: string
  clientName: string
}

function lineKey(line: DraftLine): string {
  return `${line.productId}:${line.productVariantId ?? 'p'}`
}

export default function CreateOrderForClientForm({
  clientId,
  clientName,
}: CreateOrderForClientFormProps) {
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const result = await getAvailableProducts(clientId)
      if (cancelled) return
      if (result.error) {
        setError(result.error)
      } else if (result.products) {
        setUnits(result.products as Unit[])
      }
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [clientId])

  const q = searchQuery.toLowerCase().trim()
  const filteredUnits = units.filter((u) => {
    if (!q) return true
    const nameMatch = u.name.toLowerCase().includes(q)
    const skuMatch = u.sku?.toLowerCase().includes(q)
    return nameMatch || skuMatch
  })

  const addLine = (unit: Unit, qty: number = 1) => {
    const productVariantId = unit.productVariantId ?? null
    const key = `${unit.productId}:${productVariantId ?? 'p'}`
    const existing = lines.find((l) => lineKey(l) === key)
    if (existing) {
      setLines(
        lines.map((l) =>
          lineKey(l) === key
            ? { ...l, quantity: Math.min(l.quantity + qty, l.maxQuantity) }
            : l
        )
      )
    } else {
      setLines([
        ...lines,
        {
          productId: unit.productId,
          productVariantId,
          quantity: Math.min(qty, unit.stock),
          name: unit.name,
          sku: unit.sku ?? null,
          price: unit.price,
          maxQuantity: unit.stock,
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
        return { ...l, quantity: Math.min(Math.max(1, qty), l.maxQuantity) }
      })
    )
  }

  const totalHT = lines.reduce((s, l) => s + l.price * l.quantity, 0)
  const vatRate = 0.2
  const totalTTC = totalHT * (1 + vatRate)

  const handleSubmit = async () => {
    if (lines.length === 0) {
      toast.error('Ajoutez au moins un article.')
      return
    }
    setIsSubmitting(true)
    setError(null)
    const result = await createOrderAction(
      lines.map((l) => ({
        productId: l.productId,
        productVariantId: l.productVariantId,
        quantity: l.quantity,
      })),
      clientId
    )
    if (result.error) {
      toast.error(result.error)
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    toast.success(`Commande créée pour ${clientName}.`)
    router.push('/admin/orders')
    router.refresh()
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {error && !isSubmitting && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Chargement des produits...</div>
      ) : (
        <>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Liste des produits disponibles */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Produits disponibles</h2>
              <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 rounded-md p-2">
                {filteredUnits.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit en stock'}
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
                            {unit.sku && <span className="font-mono text-gray-600 mr-1.5">{unit.sku}</span>}
                            {unit.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Stock : {unit.stock} • {(unit.price * (1 + vatRate)).toFixed(2)} Dh TTC
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
                            disabled={isSubmitting || currentQty >= unit.stock}
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

            {/* Panier / lignes de commande */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Commande ({lines.length} ligne{lines.length !== 1 ? 's' : ''})
              </h2>
              <div className="border border-gray-200 rounded-md p-3 max-h-96 overflow-y-auto space-y-2">
                {lines.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">
                    Ajoutez des produits depuis la liste.
                  </p>
                ) : (
                  lines.map((line) => (
                    <div
                      key={lineKey(line)}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {line.sku && <span className="font-mono text-gray-600 mr-1.5">{line.sku}</span>}
                          {line.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {line.quantity} × {(line.price * (1 + vatRate)).toFixed(2)} Dh TTC
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
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
                          max={line.maxQuantity}
                          value={line.quantity}
                          onChange={(e) =>
                            updateQty(lineKey(line), parseInt(e.target.value, 10) || 1)
                          }
                          className="w-14 text-center border border-gray-300 rounded py-1 text-sm"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(lineKey(line), line.quantity + 1)}
                          disabled={isSubmitting || line.quantity >= line.maxQuantity}
                          className="p-1 rounded border hover:bg-gray-100 disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(lineKey(line))}
                          disabled={isSubmitting}
                          className="p-1 rounded text-red-600 hover:bg-red-50"
                          title="Retirer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {lines.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Total HT</span>
                    <span>{totalHT.toFixed(2)} Dh</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>TVA 20%</span>
                    <span>{(totalTTC - totalHT).toFixed(2)} Dh</span>
                  </div>
                  <div className="flex justify-between font-semibold text-gray-900 mt-2">
                    <span>Total TTC</span>
                    <span>{totalTTC.toFixed(2)} Dh</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Création...' : 'Créer la commande pour ce client'}
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
