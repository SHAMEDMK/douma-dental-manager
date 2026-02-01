'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getAdminSettingsAction() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    // Upsert to ensure the settings row exists (idempotent)
    const settings = await prisma.adminSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        requireApprovalIfAnyNegativeLineMargin: true,
        requireApprovalIfMarginBelowPercent: false,
        marginPercentThreshold: 0,
        requireApprovalIfOrderTotalMarginNegative: false,
        blockWorkflowUntilApproved: true,
        approvalMessage: 'Commande à valider (marge anormale)',
      },
      update: {}, // Don't update if exists, just return it
    })

    return { success: true, settings }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la récupération des paramètres' }
  }
}

type UpdateAdminSettingsInput = {
  requireApprovalIfAnyNegativeLineMargin?: boolean
  requireApprovalIfMarginBelowPercent?: boolean
  marginPercentThreshold?: number
  requireApprovalIfOrderTotalMarginNegative?: boolean
  blockWorkflowUntilApproved?: boolean
  approvalMessage?: string
}

export async function updateAdminSettingsAction(input: UpdateAdminSettingsInput) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    // Validation: threshold must be between 0 and 100
    if (input.marginPercentThreshold !== undefined) {
      if (input.marginPercentThreshold < 0 || input.marginPercentThreshold > 100) {
        return { error: 'Le seuil de marge doit être entre 0 et 100%' }
      }
    }

    // Get old values for audit log
    const oldSettings = await prisma.adminSettings.findUnique({
      where: { id: 'default' }
    })

    // Update the settings row (id="default")
    const updated = await prisma.adminSettings.update({
      where: { id: 'default' },
      data: {
        ...(input.requireApprovalIfAnyNegativeLineMargin !== undefined && {
          requireApprovalIfAnyNegativeLineMargin: input.requireApprovalIfAnyNegativeLineMargin,
        }),
        ...(input.requireApprovalIfMarginBelowPercent !== undefined && {
          requireApprovalIfMarginBelowPercent: input.requireApprovalIfMarginBelowPercent,
        }),
        ...(input.marginPercentThreshold !== undefined && {
          marginPercentThreshold: input.marginPercentThreshold,
        }),
        ...(input.requireApprovalIfOrderTotalMarginNegative !== undefined && {
          requireApprovalIfOrderTotalMarginNegative: input.requireApprovalIfOrderTotalMarginNegative,
        }),
        ...(input.blockWorkflowUntilApproved !== undefined && {
          blockWorkflowUntilApproved: input.blockWorkflowUntilApproved,
        }),
        ...(input.approvalMessage !== undefined && {
          approvalMessage: input.approvalMessage,
        }),
      },
    })

    // Log audit: Admin settings updated (oldSettings peut être null si pas encore créé)
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'SETTINGS_UPDATED',
        'SETTINGS',
        'default',
        session as any,
        oldSettings
          ? {
              requireApprovalIfAnyNegativeLineMargin: oldSettings.requireApprovalIfAnyNegativeLineMargin,
              requireApprovalIfMarginBelowPercent: oldSettings.requireApprovalIfMarginBelowPercent,
              marginPercentThreshold: oldSettings.marginPercentThreshold,
              blockWorkflowUntilApproved: oldSettings.blockWorkflowUntilApproved,
              approvalMessage: oldSettings.approvalMessage,
            }
          : undefined,
        {
          requireApprovalIfAnyNegativeLineMargin: input.requireApprovalIfAnyNegativeLineMargin ?? oldSettings?.requireApprovalIfAnyNegativeLineMargin,
          requireApprovalIfMarginBelowPercent: input.requireApprovalIfMarginBelowPercent ?? oldSettings?.requireApprovalIfMarginBelowPercent,
          marginPercentThreshold: input.marginPercentThreshold ?? oldSettings?.marginPercentThreshold,
          blockWorkflowUntilApproved: input.blockWorkflowUntilApproved ?? oldSettings?.blockWorkflowUntilApproved,
          approvalMessage: input.approvalMessage ?? oldSettings?.approvalMessage,
        }
      )
    } catch (auditError) {
      console.error('Failed to log settings update:', auditError)
    }

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error: any) {
    // Handle case where settings row doesn't exist (shouldn't happen with upsert, but handle gracefully)
    if (error.code === 'P2025') {
      // Record not found - create it with defaults
      await prisma.adminSettings.create({
        data: {
          id: 'default',
          requireApprovalIfAnyNegativeLineMargin: input.requireApprovalIfAnyNegativeLineMargin ?? true,
          requireApprovalIfMarginBelowPercent: input.requireApprovalIfMarginBelowPercent ?? false,
          marginPercentThreshold: input.marginPercentThreshold ?? 0,
          requireApprovalIfOrderTotalMarginNegative: input.requireApprovalIfOrderTotalMarginNegative ?? false,
          blockWorkflowUntilApproved: input.blockWorkflowUntilApproved ?? true,
          approvalMessage: input.approvalMessage ?? 'Commande à valider (marge anormale)',
        },
      })
      revalidatePath('/admin/settings')
      return { success: true }
    }
    return { error: error.message || 'Erreur lors de la mise à jour des paramètres' }
  }
}
