'use client'

import { useState } from 'react'
import { fixUserTypeAction } from '@/app/actions/user'
import toast from 'react-hot-toast'

type FixUserTypeButtonProps = {
  userId: string
  userName: string
  currentUserType: string | null
  targetUserType: 'MAGASINIER' | 'LIVREUR'
}

export default function FixUserTypeButton({ 
  userId, 
  userName, 
  currentUserType, 
  targetUserType 
}: FixUserTypeButtonProps) {
  const [isFixing, setIsFixing] = useState(false)

  async function handleFix() {
    if (!confirm(`Voulez-vous vraiment changer le type de "${userName}" en ${targetUserType === 'MAGASINIER' ? 'Magasinier' : 'Livreur'} ?`)) {
      return
    }

    setIsFixing(true)
    try {
      const result = await fixUserTypeAction(userId, targetUserType)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Type corrigé : ${userName} est maintenant ${targetUserType === 'MAGASINIER' ? 'magasinier' : 'livreur'}`)
        // Refresh the page
        window.location.reload()
      }
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setIsFixing(false)
    }
  }

  const label = targetUserType === 'MAGASINIER' ? 'Magasinier' : 'Livreur'
  const icon = targetUserType === 'MAGASINIER' ? '📦' : '🚚'

  return (
    <button
      onClick={handleFix}
      disabled={isFixing}
      className="px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md disabled:opacity-50"
      title={`Corriger le type en ${label}`}
    >
      {isFixing ? 'Correction...' : `${icon} Corriger en ${label}`}
    </button>
  )
}
