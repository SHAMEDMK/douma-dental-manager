'use client'

import { assignOrderToMeAction } from '@/app/actions/delivery'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type AssignOrderButtonProps = {
  orderId: string
  orderNumber: string
  isAssigned: boolean
  assignedTo?: string | null
  currentUserName: string
}

export default function AssignOrderButton({
  orderId,
  orderNumber,
  isAssigned,
  assignedTo,
  currentUserName
}: AssignOrderButtonProps) {
  const router = useRouter()
  const [isAssigning, setIsAssigning] = useState(false)

  // If already assigned to this user, don't show button
  if (isAssigned && assignedTo === currentUserName) {
    return null
  }

  // If assigned to someone else, show info
  if (isAssigned && assignedTo && assignedTo !== currentUserName) {
    return (
      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <p className="text-sm text-orange-800">
          <strong>⚠️ Assignée à :</strong> {assignedTo}
        </p>
      </div>
    )
  }

  // If not assigned, show "Take" button
  async function handleAssign() {
    setIsAssigning(true)
    try {
      const result = await assignOrderToMeAction(orderId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Commande ${orderNumber} assignée avec succès`)
        router.refresh()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur s\'est produite'
      toast.error(errorMessage)
    } finally {
      setIsAssigning(false)
    }
  }

  return (
    <div className="mb-4">
      <button
        onClick={handleAssign}
        disabled={isAssigning}
        className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAssigning ? 'Assignation...' : '📦 Prendre en charge cette commande'}
      </button>
      <p className="text-xs text-gray-500 mt-1 text-center">
        Cliquez pour vous assigner cette commande
      </p>
    </div>
  )
}
