'use client'

import { useState, useTransition } from 'react'
import { updateAccountingLockAction } from '@/app/actions/company-settings'
import { useRouter } from 'next/navigation'

type Props = {
  /** Date actuelle de clôture (ISO string ou null) */
  accountingLockedUntil: string | null
}

export default function AccountingLockSection({ accountingLockedUntil }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newDate, setNewDate] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    if (!newDate.trim()) {
      setError('Veuillez saisir une date')
      return
    }
    const date = new Date(newDate)
    if (Number.isNaN(date.getTime())) {
      setError('Date invalide')
      return
    }
    startTransition(async () => {
      const result = await updateAccountingLockAction(date)
      if (result.success) {
        setSuccess(true)
        setNewDate('')
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Erreur lors de la mise à jour')
      }
    })
  }

  const displayDate = accountingLockedUntil
    ? new Date(accountingLockedUntil).toLocaleDateString('fr-FR', {
        dateStyle: 'long',
        timeZone: 'UTC',
      })
    : null

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Clôture comptable</h2>
      <p className="text-sm text-gray-600 mb-4">
        Les factures et paiements dont la date est antérieure ou égale à cette date ne peuvent plus être modifiés.
      </p>

      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700">Date actuelle : </span>
        <span className="text-sm text-gray-900">
          {displayDate ?? 'Non définie (aucune période clôturée)'}
        </span>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border-l-4 border-green-400 p-3">
          <p className="text-sm text-green-700">Clôture comptable mise à jour.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="accountingLockDate" className="block text-sm font-medium text-gray-700 mb-1">
            Avancer la clôture à une date
          </label>
          <input
            type="date"
            id="accountingLockDate"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            disabled={isPending}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isPending ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

      <p className="mt-3 text-xs text-gray-500">
        La clôture ne peut pas être reculée : vous ne pouvez qu’avancer la date. En développement, pour
        réinitialiser la clôture (autoriser à nouveau les modifications), exécutez :{' '}
        <code className="bg-gray-100 px-1 rounded">npm run db:reset-accounting-lock</code>
      </p>
    </div>
  )
}
