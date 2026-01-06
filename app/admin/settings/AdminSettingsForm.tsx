'use client'

import { updateAdminSettingsAction } from '@/app/actions/admin-settings'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type AdminSettings = {
  id: string
  requireApprovalIfAnyNegativeLineMargin: boolean
  requireApprovalIfMarginBelowPercent: boolean
  marginPercentThreshold: number
  requireApprovalIfOrderTotalMarginNegative: boolean
  blockWorkflowUntilApproved: boolean
  approvalMessage: string
  updatedAt: Date
}

export default function AdminSettingsForm({ initial }: { initial: AdminSettings }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  const [formData, setFormData] = useState({
    requireApprovalIfAnyNegativeLineMargin: initial.requireApprovalIfAnyNegativeLineMargin,
    requireApprovalIfMarginBelowPercent: initial.requireApprovalIfMarginBelowPercent,
    marginPercentThreshold: initial.marginPercentThreshold,
    requireApprovalIfOrderTotalMarginNegative: initial.requireApprovalIfOrderTotalMarginNegative,
    blockWorkflowUntilApproved: initial.blockWorkflowUntilApproved,
    approvalMessage: initial.approvalMessage,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFlash(null)

    try {
      const result = await updateAdminSettingsAction(formData)
      
      if (result.error) {
        setFlash({ type: 'error', message: result.error })
      } else {
        setFlash({ type: 'success', message: '✅ Paramètres enregistrés' })
        setTimeout(() => {
          setFlash(null)
          router.refresh()
        }, 2500)
      }
    } catch (e: any) {
      setFlash({ type: 'error', message: e?.message ?? 'Erreur lors de l\'enregistrement' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">

      {/* Require approval if any negative line margin */}
      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <div className="flex-1">
          <label htmlFor="requireApprovalIfAnyNegativeLineMargin" className="block text-sm font-medium text-gray-700">
            Exiger une approbation si une ligne a une marge négative
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Si activé, toute commande contenant au moins une ligne avec marge négative nécessitera une approbation admin.
          </p>
        </div>
        <div className="ml-4">
          <input
            type="checkbox"
            id="requireApprovalIfAnyNegativeLineMargin"
            checked={formData.requireApprovalIfAnyNegativeLineMargin}
            onChange={(e) =>
              setFormData({ ...formData, requireApprovalIfAnyNegativeLineMargin: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Require approval if margin below percent */}
      <div className="py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1">
            <label htmlFor="requireApprovalIfMarginBelowPercent" className="block text-sm font-medium text-gray-700">
              Exiger une approbation si la marge est en dessous d'un pourcentage
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Si activé, les commandes avec une marge moyenne en dessous du seuil nécessiteront une approbation.
            </p>
          </div>
          <div className="ml-4">
            <input
              type="checkbox"
              id="requireApprovalIfMarginBelowPercent"
              checked={formData.requireApprovalIfMarginBelowPercent}
              onChange={(e) =>
                setFormData({ ...formData, requireApprovalIfMarginBelowPercent: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>
        {formData.requireApprovalIfMarginBelowPercent && (
          <div className="mt-3">
            <label htmlFor="marginPercentThreshold" className="block text-sm font-medium text-gray-700 mb-1">
              Seuil de marge (%) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="marginPercentThreshold"
              min="0"
              max="100"
              step="0.1"
              value={formData.marginPercentThreshold}
              onChange={(e) =>
                setFormData({ ...formData, marginPercentThreshold: parseFloat(e.target.value) || 0 })
              }
              required={formData.requireApprovalIfMarginBelowPercent}
              className="mt-1 block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="0.0"
            />
            <p className="text-xs text-gray-500 mt-1">Valeur entre 0 et 100%</p>
          </div>
        )}
      </div>

      {/* Require approval if order total margin negative */}
      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <div className="flex-1">
          <label htmlFor="requireApprovalIfOrderTotalMarginNegative" className="block text-sm font-medium text-gray-700">
            Exiger une approbation si la marge totale de la commande est négative
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Si activé, les commandes avec une marge totale négative nécessiteront une approbation admin.
          </p>
        </div>
        <div className="ml-4">
          <input
            type="checkbox"
            id="requireApprovalIfOrderTotalMarginNegative"
            checked={formData.requireApprovalIfOrderTotalMarginNegative}
            onChange={(e) =>
              setFormData({ ...formData, requireApprovalIfOrderTotalMarginNegative: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Block workflow until approved */}
      <div className="flex items-center justify-between py-3 border-b border-gray-200">
        <div className="flex-1">
          <label htmlFor="blockWorkflowUntilApproved" className="block text-sm font-medium text-gray-700">
            Bloquer le workflow jusqu'à approbation
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Si activé, les commandes nécessitant une approbation ne pourront pas passer à "Préparer", "Expédier" ou "Livrer" tant qu'elles ne sont pas approuvées.
          </p>
        </div>
        <div className="ml-4">
          <input
            type="checkbox"
            id="blockWorkflowUntilApproved"
            checked={formData.blockWorkflowUntilApproved}
            onChange={(e) =>
              setFormData({ ...formData, blockWorkflowUntilApproved: e.target.checked })
            }
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
      </div>

      {/* Approval message */}
      <div className="py-3">
        <label htmlFor="approvalMessage" className="block text-sm font-medium text-gray-700 mb-1">
          Message d'approbation
        </label>
        <textarea
          id="approvalMessage"
          rows={3}
          value={formData.approvalMessage}
          onChange={(e) => setFormData({ ...formData, approvalMessage: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Message affiché pour les commandes nécessitant une approbation"
        />
        <p className="text-xs text-gray-500 mt-1">
          Ce message sera affiché aux admins pour les commandes nécessitant une approbation.
        </p>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
        {flash && (
          <div className={`p-3 rounded-md border ${
            flash.type === 'success' 
              ? 'bg-green-100 text-green-800 border-green-300' 
              : 'bg-red-100 text-red-800 border-red-300'
          }`}>
            <p className="text-sm font-medium">{flash.message}</p>
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-900 hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </form>
  )
}
