'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function updateClient(
  clientId: string,
  data: {
    name?: string
    companyName?: string
    segment?: 'LABO' | 'DENTISTE' | 'REVENDEUR'
    discountRate?: number | null
    creditLimit?: number | null
  }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  // Verify client exists and is a CLIENT
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { role: true }
  })

  if (!client) {
    return { error: 'Client introuvable' }
  }

  if (client.role !== 'CLIENT') {
    return { error: 'Cet utilisateur n\'est pas un client' }
  }

  // Validate discountRate if provided
  if (data.discountRate !== null && data.discountRate !== undefined) {
    if (isNaN(data.discountRate) || data.discountRate < 0 || data.discountRate > 100) {
      return { error: 'La remise doit être un nombre entre 0 et 100' }
    }
  }

  // Validate creditLimit if provided
  if (data.creditLimit !== null && data.creditLimit !== undefined) {
    if (isNaN(data.creditLimit) || data.creditLimit < 0) {
      return { error: 'Le plafond de crédit doit être un nombre positif ou nul' }
    }
  }

  try {
    await prisma.user.update({
      where: { id: clientId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.companyName !== undefined && { companyName: data.companyName }),
        ...(data.segment !== undefined && { segment: data.segment }),
        ...(data.discountRate !== undefined && { discountRate: data.discountRate ?? null }),
        ...(data.creditLimit !== undefined && { creditLimit: data.creditLimit ?? 0 })
      }
    })

    revalidatePath('/admin/clients')
    revalidatePath(`/admin/clients/${clientId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la mise à jour du client' }
  }
}
