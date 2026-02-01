'use client'

import { reassignDeliveryAgentAction } from '@/app/actions/admin-orders'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type ReassignDeliveryAgentModalProps = {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderNumber: string
  currentAgentName?: string | null
}

export default function ReassignDeliveryAgentModal({ 
  isOpen, 
  onClose, 
  orderId, 
  orderNumber,
  currentAgentName 
}: ReassignDeliveryAgentModalProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deliveryAgents, setDeliveryAgents] = useState<Array<{ id: string; name: string; email: string }>>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  // Fetch delivery agents when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingAgents(true)
      setSelectedAgentId('') // Reset selection when modal opens
      fetch('/api/delivery/agents')
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            const errorMsg = errorData.error || `HTTP ${res.status || 'unknown'}`
            console.error('Failed to fetch delivery agents:', errorMsg)
            throw new Error(errorMsg)
          }
          return res.json()
        })
        .then(data => {
          if (data.agents && Array.isArray(data.agents)) {
            console.log('Delivery agents loaded:', data.agents.length, 'agents')
            setDeliveryAgents(data.agents)
          } else {
            console.warn('No agents in response or invalid format:', data)
            setDeliveryAgents([])
          }
          setLoadingAgents(false)
        })
        .catch((err) => {
          console.error('Error fetching delivery agents:', err)
          setError(`Impossible de charger la liste des livreurs: ${err.message || 'Erreur inconnue'}`)
          setLoadingAgents(false)
        })
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const formData = new FormData(e.currentTarget)
      const deliveryAgentName = formData.get('deliveryAgentName') as string
      
      // Get ID from state first (most reliable), then from formData, then from selected agent by name
      let deliveryAgentId = selectedAgentId || (formData.get('deliveryAgentId') as string | null) || ''
      
      // If still no ID, try to find it from the selected name
      if (!deliveryAgentId && deliveryAgentName) {
        const agent = deliveryAgents.find(a => a.name === deliveryAgentName)
        if (agent) {
          deliveryAgentId = agent.id
        }
      }
      
      // Also try to get it from the select element's data attribute as fallback
      if (!deliveryAgentId) {
        const selectElement = e.currentTarget.querySelector('select[name="deliveryAgentName"]') as HTMLSelectElement
        if (selectElement && selectElement.selectedIndex > 0) {
          const selectedOption = selectElement.options[selectElement.selectedIndex]
          const agentIdFromData = selectedOption.getAttribute('data-agent-id')
          if (agentIdFromData) {
            deliveryAgentId = agentIdFromData
          }
        }
      }

      // Validate required fields
      if (!deliveryAgentName || deliveryAgentName.trim() === '') {
        setError('Le nom du livreur est obligatoire')
        setIsSubmitting(false)
        return
      }

      // Log what we're sending for debugging
      console.log('Reassigning order to:', {
        deliveryAgentName: deliveryAgentName.trim(),
        deliveryAgentId: deliveryAgentId || '(not provided)',
        selectedAgentId: selectedAgentId || '(empty)',
        orderId,
        agentsCount: deliveryAgents.length
      })
      
      // Final validation: if we still don't have an ID, try one more time from the agents list
      if (!deliveryAgentId && deliveryAgentName) {
        const agent = deliveryAgents.find(a => a.name === deliveryAgentName)
        if (agent) {
          deliveryAgentId = agent.id
          console.log('Found agent ID from list:', agent.id)
        } else {
          console.warn('Could not find agent ID for name:', deliveryAgentName)
        }
      }

      const result = await reassignDeliveryAgentAction(orderId, {
        deliveryAgentName: deliveryAgentName.trim(),
        deliveryAgentId: deliveryAgentId || undefined,
      })

      if (result?.error) {
        setError(result.error)
        setIsSubmitting(false)
      } else {
        router.refresh()
        onClose()
      }
    } catch (err) {
      console.error('Error reassigning delivery agent:', err)
      setError(err instanceof Error ? err.message : 'Une erreur inattendue s\'est produite')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Réassigner le livreur
            </h3>

            {currentAgentName && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm mb-4">
                Livreur actuel: <strong>{currentAgentName}</strong>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau livreur <span className="text-red-500">*</span>
                </label>
                {loadingAgents ? (
                  <div className="w-full text-sm px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-500">
                    Chargement des livreurs...
                  </div>
                ) : deliveryAgents.length > 0 ? (
                  <>
                    <select
                      name="deliveryAgentName"
                      required
                      disabled={isSubmitting}
                      className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                      onChange={(e) => {
                        // Also set the agent ID in state and hidden field
                        const selectedAgent = deliveryAgents.find(a => a.name === e.target.value)
                        if (selectedAgent) {
                          setSelectedAgentId(selectedAgent.id)
                          const hiddenInput = document.getElementById('deliveryAgentId') as HTMLInputElement
                          if (hiddenInput) {
                            hiddenInput.value = selectedAgent.id
                          }
                          console.log('Delivery agent selected:', { name: selectedAgent.name, id: selectedAgent.id })
                        } else {
                          setSelectedAgentId('')
                          const hiddenInput = document.getElementById('deliveryAgentId') as HTMLInputElement
                          if (hiddenInput) {
                            hiddenInput.value = ''
                          }
                        }
                      }}
                    >
                      <option value="">Sélectionner un livreur</option>
                      {deliveryAgents.map(agent => (
                        <option key={agent.id} value={agent.name} data-agent-id={agent.id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </select>
                    <input type="hidden" id="deliveryAgentId" name="deliveryAgentId" value={selectedAgentId} />
                  </>
                ) : (
                  <input
                    type="text"
                    name="deliveryAgentName"
                    required
                    disabled={isSubmitting}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                    placeholder="Nom du livreur (saisie manuelle)"
                  />
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Le nouveau livreur sera notifié automatiquement
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Réassignation...' : 'Confirmer réassignation'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
