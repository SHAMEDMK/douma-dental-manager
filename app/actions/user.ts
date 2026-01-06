'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

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

    // Handle case where creditLimit might not exist yet (fallback to 0)
    const creditLimit = (user as any).creditLimit ?? 0
    const balance = user.balance ?? 0

    return {
      balance: balance,
      creditLimit: creditLimit,
      available: Math.max(0, creditLimit - balance)
    }
  } catch (error: any) {
    console.error('Error in getUserCreditInfo:', error)
    // Return default values on error instead of failing completely
    return {
      balance: 0,
      creditLimit: 0,
      available: 0,
      error: error.message || 'Erreur lors de la récupération des informations'
    }
  }
}

