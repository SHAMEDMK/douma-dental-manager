'use client'

import { markInvoicePaid } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentForm({ invoiceId, balance }: { invoiceId: string, balance: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Encaisser ({balance.toFixed(2)} €)
      </button>
    )
  }

  return (
    <form 
      action={async (formData) => {
        const method = formData.get('method') as string
        const reference = formData.get('reference') as string
        const amountStr = formData.get('amount') as string
        const amount = parseFloat(amountStr)
        
        setIsSubmitting(true)
        setError(null)
        setSuccess(false)
        
        if (isNaN(amount) || amount <= 0) {
          setError('Montant invalide')
          setIsSubmitting(false)
          return
        }
        
        if (amount > balance + 0.01) {
          setError(`Le montant dépasse le solde restant (${balance.toFixed(2)} €)`)
          setIsSubmitting(false)
          return
        }
        
        const result = await markInvoicePaid(invoiceId, method, reference, amount)
        
        if (result.error) {
          setError(result.error)
          setIsSubmitting(false)
        } else {
          setSuccess(true)
          setIsSubmitting(false)
          setTimeout(() => {
            setSuccess(false)
            setIsOpen(false)
            router.refresh()
          }, 3000)
        }
      }}
      className="bg-gray-50 p-4 rounded border border-gray-200 flex flex-col gap-2"
    >
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
          Paiement enregistré
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-700">Montant à encaisser</label>
        <input 
          name="amount" 
          type="number" 
          step="0.01" 
          defaultValue={balance}
          max={balance}
          required
          disabled={isSubmitting}
          className="text-sm p-1 rounded border disabled:opacity-50"
        />
      </div>
      <select name="method" required disabled={isSubmitting} className="text-sm p-1 rounded border disabled:opacity-50">
        <option value="CASH">Espèces</option>
        <option value="CHECK">Chèque</option>
        <option value="TRANSFER">Virement</option>
      </select>
      <input 
        name="reference" 
        placeholder="Réf. Paiement (Optionnel)" 
        disabled={isSubmitting}
        className="text-sm p-1 rounded border disabled:opacity-50"
      />
      <div className="flex gap-2">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement...' : 'Confirmer'}
        </button>
        <button 
          type="button" 
          onClick={() => {
            setIsOpen(false)
            setError(null)
            setSuccess(false)
          }}
          disabled={isSubmitting}
          className="bg-gray-300 text-gray-700 px-3 py-1 text-sm rounded hover:bg-gray-400 disabled:opacity-50"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}
