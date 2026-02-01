'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { logEntityCreation, logEntityDeletion } from '@/lib/audit'

/**
 * Create a new delivery agent (MAGASINIER)
 */
export async function createDeliveryAgentAction(data: {
  email: string
  name: string
  password: string
  userType?: 'MAGASINIER' | 'LIVREUR' // Optional: distinguish magasinier from livreur
}) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return { error: 'Non autorisé' }
    }

    const { name, password } = data
    
    // Normalize email to lowercase to avoid case-sensitive duplicates
    const email = data.email?.trim().toLowerCase()

    // Validate inputs
    if (!email || !name || !password) {
      return { error: 'Tous les champs sont obligatoires' }
    }

    if (password.length < 8) {
      return { error: 'Le mot de passe doit contenir au moins 8 caractères' }
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      return { error: 'Un utilisateur avec cet email existe déjà' }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user with MAGASINIER role
    // userType distinguishes: 'MAGASINIER' (warehouse) vs 'LIVREUR' (delivery)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: 'MAGASINIER',
        userType: data.userType || 'LIVREUR', // Default to LIVREUR if not specified (for backward compatibility)
        segment: 'LABO', // Default segment
        creditLimit: 0, // No credit limit for delivery agents
        passwordHash
      }
    })

    // Log creation
    try {
      await logEntityCreation(
        'DELIVERY_AGENT_CREATED',
        'USER',
        user.id,
        session as any,
        { email, name, role: 'MAGASINIER' }
      )
    } catch (auditError) {
      console.error('Failed to log delivery agent creation:', auditError)
    }

    revalidatePath('/admin/delivery-agents')
    revalidatePath('/admin')

    return { success: true, userId: user.id }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la création du livreur' }
  }
}

/**
 * Delete a delivery agent (MAGASINIER)
 */
export async function deleteDeliveryAgentAction(agentId: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return { error: 'Non autorisé' }
    }

    // Get the agent
    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        _count: {
          select: {
            orders: true // Count all orders, not just SHIPPED/DELIVERED
          }
        }
      }
    })

    if (!agent) {
      return { error: 'Livreur introuvable' }
    }

    if (agent.role !== 'MAGASINIER') {
      return { error: 'Cet utilisateur n\'est pas un livreur' }
    }

    // Check if agent has orders
    if (agent._count.orders > 0) {
      return { 
        error: `Impossible de supprimer ce livreur : ${agent._count.orders} commande${agent._count.orders > 1 ? 's' : ''} associée${agent._count.orders > 1 ? 's' : ''}`
      }
    }

    // Delete the agent
    await prisma.user.delete({
      where: { id: agentId }
    })

    // Log deletion
    try {
      await logEntityDeletion(
        'DELIVERY_AGENT_DELETED',
        'USER',
        agentId,
        session as any,
        { email: agent.email, name: agent.name }
      )
    } catch (auditError) {
      console.error('Failed to log delivery agent deletion:', auditError)
    }

    revalidatePath('/admin/delivery-agents')
    revalidatePath('/admin')

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la suppression du livreur' }
  }
}
