'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateClientSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').optional(),
  clientCode: z.string().trim().optional().nullable(),
  companyName: z.string().optional(),
  segment: z.enum(['LABO', 'DENTISTE', 'REVENDEUR']).optional(),
  discountRate: z.number().min(0).max(100).nullable().optional(),
  creditLimit: z.number().min(0).nullable().optional(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  ice: z.string().trim().refine(
    (val) => !val || val.length === 0 || val.length >= 5,
    { message: 'L\'ICE doit contenir au moins 5 caractères si rempli' }
  ).optional().nullable(),
})

export async function updateClient(
  clientId: string,
  data: {
    name?: string
    clientCode?: string | null
    companyName?: string
    segment?: 'LABO' | 'DENTISTE' | 'REVENDEUR'
    discountRate?: number | null
    creditLimit?: number | null
    phone?: string | null
    address?: string | null
    city?: string | null
    ice?: string | null
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

  // Transform empty strings to null for optional fields
  const processedData = {
    ...data,
    clientCode: data.clientCode === '' ? null : data.clientCode?.trim() || null,
    phone: data.phone === '' ? null : data.phone,
    address: data.address === '' ? null : data.address,
    city: data.city === '' ? null : data.city,
    ice: data.ice === '' ? null : data.ice,
  }

  // Validate with Zod
  const validationResult = updateClientSchema.safeParse(processedData)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return { error: firstError?.message || 'Données invalides' }
  }

  const validatedData = validationResult.data

  // If setting clientCode, ensure it's not already used by another user
  if (validatedData.clientCode !== undefined && validatedData.clientCode !== null && validatedData.clientCode !== '') {
    const existing = await prisma.user.findFirst({
      where: {
        clientCode: validatedData.clientCode,
        id: { not: clientId },
      },
      select: { id: true },
    })
    if (existing) {
      return { error: 'Ce code client est déjà utilisé par un autre client.' }
    }
  }

  try {
    // Get old client data for audit log
    const oldClient = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        name: true,
        clientCode: true,
        companyName: true,
        segment: true,
        discountRate: true,
        creditLimit: true,
        phone: true,
        address: true,
        city: true,
        ice: true,
        email: true
      }
    })

    await prisma.user.update({
      where: { id: clientId },
      data: {
        ...(validatedData.name !== undefined && { name: validatedData.name }),
        ...(validatedData.clientCode !== undefined && { clientCode: validatedData.clientCode ?? null }),
        ...(validatedData.companyName !== undefined && { companyName: validatedData.companyName }),
        ...(validatedData.segment !== undefined && { segment: validatedData.segment }),
        ...(validatedData.discountRate !== undefined && { discountRate: validatedData.discountRate ?? null }),
        ...(validatedData.creditLimit !== undefined && { creditLimit: validatedData.creditLimit ?? 0 }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone?.trim() || null }),
        ...(validatedData.address !== undefined && { address: validatedData.address?.trim() || null }),
        ...(validatedData.city !== undefined && { city: validatedData.city?.trim() || null }),
        ...(validatedData.ice !== undefined && { ice: validatedData.ice?.trim() || null }),
      }
    })

    // Log audit: Client updated
    try {
      const { logEntityUpdate } = await import('@/lib/audit')
      await logEntityUpdate(
        'CLIENT_UPDATED',
        'CLIENT',
        clientId,
        session as any,
        oldClient || {},
        validatedData
      )
    } catch (auditError) {
      console.error('Failed to log client update:', auditError)
    }

    revalidatePath('/admin/clients')
    revalidatePath(`/admin/clients/${clientId}`)
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la mise à jour du client' }
  }
}

/**
 * Delete a client
 * Prevents deletion if client has any orders (to maintain data integrity)
 */
export async function deleteClientAction(clientId: string) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    // Check if client exists and get its details for audit log
    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        email: true,
        name: true,
        companyName: true,
        segment: true,
        role: true,
        orders: {
          select: { id: true }
        }
      }
    })

    if (!client) {
      return { error: 'Client introuvable' }
    }

    if (client.role !== 'CLIENT') {
      return { error: 'Cet utilisateur n\'est pas un client' }
    }

    // Prevent deletion if client has any orders (to maintain data integrity)
    if (client.orders && client.orders.length > 0) {
      return { 
        error: `Impossible de supprimer ce client car il a ${client.orders.length} commande(s). Pour supprimer un client, il ne doit pas avoir de commandes existantes.` 
      }
    }

    // Delete client (FavoriteProduct entries will be cascade deleted, orders don't exist so no issue)
    await prisma.user.delete({
      where: { id: clientId }
    })

    // Log audit: Client deleted
    try {
      const { logEntityDeletion } = await import('@/lib/audit')
      await logEntityDeletion(
        'CLIENT_DELETED',
        'CLIENT',
        clientId,
        session as any,
        {
          email: client.email,
          name: client.name,
          companyName: client.companyName,
          segment: client.segment,
        }
      )
    } catch (auditError) {
      console.error('Failed to log client deletion:', auditError)
    }

    revalidatePath('/admin/clients')
    return { success: true }
  } catch (error: any) {
    // If foreign key constraint error, client is still referenced
    if (error.code === 'P2003' || error.message?.includes('foreign key')) {
      return { error: 'Impossible de supprimer ce client car il est référencé dans des commandes existantes.' }
    }
    return { error: error.message || 'Erreur lors de la suppression du client' }
  }
}
