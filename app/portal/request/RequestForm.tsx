'use client'

import { useState } from 'react'
import { createClientRequestAction } from '@/app/actions/client-request'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Send, AlertCircle } from 'lucide-react'

const MAX_MESSAGE_LENGTH = 500

const REQUEST_TYPES = [
  { value: 'PRODUCT_REQUEST', label: '🔍 Besoin de produit', description: 'Recherche un produit spécifique' },
  { value: 'ADVICE', label: '💡 Demande de conseil', description: 'Besoin d\'aide ou de recommandation' },
  { value: 'CONTACT', label: '📞 Demande de contact', description: 'Souhaite être contacté' },
  { value: 'REMARK', label: '📝 Remarque/Suggestion', description: 'Commentaire ou suggestion' }
] as const

export default function RequestForm() {
  const [type, setType] = useState<'PRODUCT_REQUEST' | 'ADVICE' | 'CONTACT' | 'REMARK'>('PRODUCT_REQUEST')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const remainingChars = MAX_MESSAGE_LENGTH - message.length
  const canSubmit = message.trim().length > 0 && message.length <= MAX_MESSAGE_LENGTH && !isSubmitting

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!canSubmit) return

    setIsSubmitting(true)
    
    try {
      const result = await createClientRequestAction(type, message)
      
      if (result.error) {
        console.error('Error from server action:', result.error, result.details)
        toast.error(result.error)
      } else {
        toast.success('Votre demande a été envoyée avec succès !')
        setMessage('')
        setType('PRODUCT_REQUEST')
        router.refresh()
      }
    } catch (error: any) {
      console.error('Unexpected error in form submission:', error)
      toast.error(error?.message || 'Une erreur est survenue lors de l\'envoi')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type de demande */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Type de demande <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REQUEST_TYPES.map((reqType) => (
            <button
              key={reqType.value}
              type="button"
              onClick={() => setType(reqType.value as any)}
              className={`p-3 border-2 rounded-lg text-left transition-all ${
                type === reqType.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm text-gray-900">{reqType.label}</div>
              <div className="text-xs text-gray-500 mt-1">{reqType.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Votre message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          maxLength={MAX_MESSAGE_LENGTH}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Décrivez votre besoin, votre question ou votre remarque..."
        />
        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-gray-500">
            {remainingChars >= 0 ? (
              <span>{remainingChars} caractère(s) restant(s)</span>
            ) : (
              <span className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Limite dépassée
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {message.length} / {MAX_MESSAGE_LENGTH}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="h-4 w-4" />
        <span>{isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}</span>
      </button>

      <p className="text-xs text-gray-500 text-center">
        Nous vous répondrons dans les plus brefs délais
      </p>
    </form>
  )
}
