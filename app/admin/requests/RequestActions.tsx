'use client'

import { useState } from 'react'
import { updateRequestStatusAction } from '@/app/actions/client-request'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Check, FileText, Mail, Phone, MessageCircle } from 'lucide-react'

/** Normalise le numéro pour WhatsApp : chiffres uniquement, indicatif Maroc 212 si numéro commence par 0 */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) {
    return '212' + digits.slice(1) // Maroc : 0XXXXXXXXX → 212XXXXXXXXX
  }
  if (digits.length === 9 && /^[67]/.test(digits)) {
    return '212' + digits // 6 ou 7 → 2126...
  }
  return digits
}

type Request = {
  id: string
  status: string
  user: {
    email: string
    phone: string | null
  }
}

type RequestActionsProps = {
  request: Request
}

export default function RequestActions({ request }: RequestActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const router = useRouter()

  const handleStatusChange = async (status: 'READ' | 'RESOLVED') => {
    setIsUpdating(true)
    try {
      const result = await updateRequestStatusAction(request.id, status, notes || undefined)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Demande marquée comme ${status === 'READ' ? 'lue' : 'résolue'}`)
        setShowNotes(false)
        setNotes('')
        router.refresh()
      }
    } catch (error) {
      toast.error('Une erreur est survenue')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
      {/* Contact buttons */}
      <a
        href={`mailto:${request.user.email}`}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        <Mail className="h-4 w-4" />
        <span>Email</span>
      </a>
      {request.user.phone && (
        <>
          <a
            href={`tel:${request.user.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-700 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            <Phone className="h-4 w-4" />
            <span>Appeler</span>
          </a>
          <a
            href={`https://wa.me/${toWhatsAppNumber(request.user.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#25D366] text-white rounded-md hover:bg-[#20BD5A] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        </>
      )}

      {/* Status actions */}
      {request.status === 'PENDING' && (
        <button
          onClick={() => handleStatusChange('READ')}
          disabled={isUpdating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Check className="h-4 w-4" />
          <span>Marquer comme lue</span>
        </button>
      )}

      {request.status !== 'RESOLVED' && (
        <>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>{showNotes ? 'Masquer' : 'Ajouter'} notes</span>
          </button>

          {showNotes && (
            <div className="w-full">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes internes (optionnel)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              />
            </div>
          )}

          <button
            onClick={() => handleStatusChange('RESOLVED')}
            disabled={isUpdating}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Check className="h-4 w-4" />
            <span>Marquer comme résolue</span>
          </button>
        </>
      )}

      {request.status === 'RESOLVED' && (
        <span className="text-sm text-green-600 font-medium">✓ Résolue</span>
      )}
    </div>
  )
}
