'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const updateMyProfileSchema = z.object({
  companyName: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  ice: z.string().trim().refine(
    (val) => !val || val.length === 0 || val.length >= 5,
    { message: 'L\'ICE doit contenir au moins 5 caractères si rempli' }
  ).optional().nullable(),
})

export async function getUserCreditInfo() {
  const session = await getSession()
  if (!session) return { error: 'Non autorisé' }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { balance: true, creditLimit: true }
    })

    if (!user) {
      return { error: 'Utilisateur introuvable' }
    }

    const creditLimit = user.creditLimit ?? 0
    const balance = user.balance ?? 0

    return {
      balance: balance,
      creditLimit: creditLimit,
      available: Math.max(0, creditLimit - balance)
    }
  } catch (error: unknown) {
    console.error('Error in getUserCreditInfo:', error)
    const message = error instanceof Error ? error.message : 'Erreur lors de la récupération des informations'
    return {
      balance: 0,
      creditLimit: 0,
      available: 0,
      error: message,
    }
  }
}

export async function getMyProfileAction() {
  const session = await getSession()
  if (!session) {
    return { error: 'Non autorisé' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        companyName: true,
        phone: true,
        address: true,
        city: true,
        ice: true,
      }
    })

    if (!user) {
      return { error: 'Utilisateur introuvable' }
    }

    return {
      companyName: user.companyName,
      phone: user.phone,
      address: user.address,
      city: user.city,
      ice: user.ice,
    }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la récupération du profil' }
  }
}

export async function updateMyProfileAction(data: {
  companyName?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  ice?: string | null
}) {
  const session = await getSession()
  if (!session) {
    return { error: 'Non autorisé' }
  }

  // Transform empty strings to null for optional fields
  const processedData = {
    companyName: data.companyName === '' ? null : data.companyName,
    phone: data.phone === '' ? null : data.phone,
    address: data.address === '' ? null : data.address,
    city: data.city === '' ? null : data.city,
    ice: data.ice === '' ? null : data.ice,
  }

  // Validate with Zod
  const validationResult = updateMyProfileSchema.safeParse(processedData)
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0]
    return { error: firstError?.message || 'Données invalides' }
  }

  const validatedData = validationResult.data

  try {
    await prisma.user.update({
      where: { id: session.id },
      data: {
        ...(validatedData.companyName !== undefined && { companyName: validatedData.companyName?.trim() || null }),
        ...(validatedData.phone !== undefined && { phone: validatedData.phone?.trim() || null }),
        ...(validatedData.address !== undefined && { address: validatedData.address?.trim() || null }),
        ...(validatedData.city !== undefined && { city: validatedData.city?.trim() || null }),
        ...(validatedData.ice !== undefined && { ice: validatedData.ice?.trim() || null }),
      }
    })

    revalidatePath('/portal/settings')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la mise à jour du profil' }
  }
}

/**
 * Fix userType for a user (admin only)
 */
export async function fixUserTypeAction(userId: string, userType: 'MAGASINIER' | 'LIVREUR') {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        userType: true 
      }
    })

    if (!user) {
      return { error: 'Utilisateur introuvable' }
    }

    if (user.role !== 'MAGASINIER') {
      return { error: 'Cette action ne peut être effectuée que sur des utilisateurs avec le rôle MAGASINIER' }
    }

    // Update userType
    await prisma.user.update({
      where: { id: userId },
      data: { userType }
    })

    // Log audit
    try {
      const { auditLogWithSession } = await import('@/lib/audit')
      await auditLogWithSession(
        {
          action: 'USER_TYPE_UPDATED',
          entityType: 'USER',
          entityId: userId,
          details: { 
            email: user.email, 
            name: user.name,
            oldUserType: user.userType,
            newUserType: userType
          }
        },
        { id: session.id, email: session.email, role: session.role }
      )
    } catch (auditError) {
      console.error('Failed to log user type update:', auditError)
    }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la correction du type utilisateur' }
  }
}
