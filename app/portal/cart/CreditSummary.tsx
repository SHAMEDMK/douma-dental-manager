'use client'

import { useEffect, useMemo, useState } from 'react'
import { getUserCreditInfo } from '@/app/actions/user'

type CreditInfo = {
  creditLimit: number
  balance: number
}

function formatMoney(value: number) {
  // Format number with 2 decimals, no currency symbol
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

export default function CreditSummary({ 
  cartTotal,
  onBlockedChange 
}: { 
  cartTotal: number
  onBlockedChange?: (blocked: boolean) => void
}) {
  const [credit, setCredit] = useState<CreditInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const info = await getUserCreditInfo()
        if (!mounted) return
        if (info && 'balance' in info && !('error' in info && info.error)) {
          setCredit({
            creditLimit: Number(info.creditLimit ?? 0),
            balance: Number(info.balance ?? 0),
          })
        } else {
          setError("Impossible de charger les informations de crédit.")
        }
      } catch {
        if (!mounted) return
        setError("Impossible de charger les informations de crédit.")
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  const { available, blocked } = useMemo(() => {
    const creditLimit = credit?.creditLimit ?? 0
    const balance = credit?.balance ?? 0
    const availableRaw = creditLimit - balance
    const available = Math.max(0, availableRaw)
    const blocked = creditLimit <= 0 || balance + cartTotal > creditLimit
    return { available, blocked }
  }, [credit, cartTotal])

  // Notify parent when blocked status changes
  useEffect(() => {
    if (onBlockedChange) onBlockedChange(blocked)
  }, [blocked, onBlockedChange])

  if (loading) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        <div className="text-sm text-gray-600">Chargement du crédit…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="border rounded-xl p-4 bg-white">
        <div className="text-sm text-red-600">{error}</div>
      </div>
    )
  }

  const creditLimit = credit?.creditLimit ?? 0
  const balance = credit?.balance ?? 0

  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Crédit</div>
        {creditLimit === 0 && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
            Aucun crédit autorisé
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div className="text-gray-600">Plafond</div>
        <div className="text-right font-semibold">{formatMoney(creditLimit)}</div>

        <div className="text-gray-600">Solde actuel</div>
        <div className="text-right font-semibold">{formatMoney(balance)}</div>

        <div className="text-gray-600">Disponible</div>
        <div className="text-right font-semibold">{formatMoney(available)}</div>

        <div className="text-gray-600">Panier</div>
        <div className="text-right font-semibold">{formatMoney(cartTotal)}</div>
      </div>

      {blocked && (
        <div className="mt-3 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700 font-semibold">
          Plafond de crédit dépassé. Disponible: {formatMoney(available)}. Montant panier: {formatMoney(cartTotal)}.
        </div>
      )}
    </div>
  )
}
