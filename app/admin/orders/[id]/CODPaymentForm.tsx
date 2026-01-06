'use client'

import { markInvoicePaid } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculateTotalPaid } from '@/app/lib/invoice-utils'

type CODPaymentFormProps = {
  invoiceId: string
  invoiceAmount: number
  payments: { amount: number }[]
}

export default function CODPaymentForm({ invoiceId, invoiceAmount, payments }: CODPaymentFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const totalPaid = calculateTotalPaid(payments)
  const remaining = invoiceAmount - totalPaid

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    const amountStr = formData.get('amount') as string
    const amount = parseFloat(amountStr)
    const reference = formData.get('reference') as string

    if (isNaN(amount) || amount <= 0) {
      setError('Montant invalide')
      setIsSubmitting(false)
      return
    }

    if (amount > remaining + 0.01) {
      setError(`Le montant dépasse le solde restant (${remaining.toFixed(2)} €)`)
      setIsSubmitting(false)
      return
    }

    const result = await markInvoicePaid(invoiceId, 'COD', reference || null, amount)

    if (result.error) {
      setError(result.error)
      setIsSubmitting(false)
    } else {
      setSuccess(true)
      setIsSubmitting(false)
      setTimeout(() => {
        setSuccess(false)
        router.refresh()
      }, 2000)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Encaisser (COD)</h3>
      
      {/* Invoice Summary */}
      <div className="mb-4 p-3 bg-gray-50 rounded text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">Montant facture:</span>
          <span className="font-medium text-gray-900">{invoiceAmount.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Total payé:</span>
          <span className="font-medium text-green-600">{totalPaid.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Reste:</span>
          <span className={`font-medium ${remaining > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
            {remaining.toFixed(2)} €
          </span>
        </div>
      </div>

      <form action={handleSubmit} className="space-y-3">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
            Encaissement enregistré
          </div>
        )}

        <div>
          <label htmlFor="cod-amount" className="block text-xs font-medium text-gray-700 mb-1">
            Montant à encaisser
          </label>
          <input
            id="cod-amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            max={remaining}
            defaultValue={remaining > 0 ? remaining.toFixed(2) : ''}
            required
            disabled={isSubmitting || remaining < 0.01}
            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="cod-reference" className="block text-xs font-medium text-gray-700 mb-1">
            Note (optionnel)
          </label>
          <input
            id="cod-reference"
            name="reference"
            type="text"
            placeholder="Encaissement livreur"
            disabled={isSubmitting}
            className="w-full text-sm p-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || remaining < 0.01}
          className="w-full bg-blue-600 text-white px-4 py-2 text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Enregistrement...' : 'Encaisser (COD)'}
        </button>
      </form>
    </div>
  )
}
