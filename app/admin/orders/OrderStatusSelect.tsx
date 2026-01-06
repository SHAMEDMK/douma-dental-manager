'use client'

import { updateOrderStatus } from '@/app/actions/admin-orders'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Define valid status transitions (same as in admin-orders.ts)
const VALID_TRANSITIONS: Record<string, string[]> = {
  'CONFIRMED': ['PREPARED', 'CANCELLED'],
  'PREPARED': ['SHIPPED', 'CANCELLED'],
  'SHIPPED': ['DELIVERED'],
  'DELIVERED': [],
  'CANCELLED': [],
}

const STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmée' },
  { value: 'PREPARED', label: 'Préparée' },
  { value: 'SHIPPED', label: 'Expédiée' },
  { value: 'DELIVERED', label: 'Livrée' },
  { value: 'CANCELLED', label: 'Annulée' },
]

export default function OrderStatusSelect({ orderId, currentStatus, requiresAdminApproval = false }: { orderId: string, currentStatus: string, requiresAdminApproval?: boolean }) {
  const [status, setStatus] = useState(currentStatus)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // Get valid options for current status (include current status + allowed transitions)
  // Exclude SHIPPED and DELIVERED - they must use specialized actions (modals)
  const getValidOptions = () => {
    const allowed = VALID_TRANSITIONS[currentStatus] || []
    return STATUS_OPTIONS.filter(opt => 
      (opt.value === currentStatus || allowed.includes(opt.value)) &&
      opt.value !== 'SHIPPED' &&
      opt.value !== 'DELIVERED'
    )
  }

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value
    setIsUpdating(true)
    setError(null)
    setSuccess(false)

    const result = await updateOrderStatus(orderId, newStatus)
    
    if (result.error) {
      setError(result.error)
      setStatus(currentStatus) // Revert to current status
    } else {
      setStatus(newStatus)
      setSuccess(true)
      // Refresh to show updated data
      setTimeout(() => {
        router.refresh()
        setSuccess(false)
      }, 1500)
    }
    
    setIsUpdating(false)
  }

  const validOptions = getValidOptions()
  const isFinalState = currentStatus === 'DELIVERED' || currentStatus === 'CANCELLED'
  const isDisabled = isUpdating || isFinalState || requiresAdminApproval

  return (
    <div className="flex flex-col gap-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={isDisabled}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-1 ${
          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {validOptions.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {requiresAdminApproval && (
        <span className="text-xs text-orange-600">
          Cette commande nécessite une approbation admin
        </span>
      )}
      {isFinalState && !requiresAdminApproval && (
        <span className="text-xs text-gray-500">
          {currentStatus === 'DELIVERED' ? 'Commande livrée - statut final' : 'Commande annulée - statut final'}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
      {success && (
        <span className="text-xs text-green-600">Statut mis à jour avec succès</span>
      )}
    </div>
  )
}
