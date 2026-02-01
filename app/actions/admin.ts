'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { logEntityCreation } from '@/lib/audit'

export async function createInvitationAction(formData: FormData) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return { error: 'Non autorisé' }
  }

  const rawEmail = formData.get('email') as string

  if (!rawEmail) return { error: 'Email requis' }

  // Normalize email to lowercase to avoid case-sensitive duplicates
  const email = rawEmail.trim().toLowerCase()

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) return { error: 'Utilisateur déjà existant' }

  // Create invitation
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await prisma.invitation.create({
    data: {
      email,
      token,
      expiresAt,
    }
  })

  // Log audit: Invitation created
  try {
    await logEntityCreation(
      'INVITATION_CREATED',
      'USER',
      invitation.id,
      session as any,
      {
        email: email,
        expiresAt: expiresAt.toISOString()
      }
    )
  } catch (auditError) {
    console.error('Failed to log invitation creation:', auditError)
  }

  // In a real app, send email here.
  // For now, we return the link to display it.

  revalidatePath('/admin/clients')
  return { success: true, link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}` }
}

/**
 * Create a new accountant (COMPTABLE role)
 */
export async function createAccountantAction(data: {
  email: string
  name: string
  password: string
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

    // Create user with COMPTABLE role
                const user = await prisma.user.create({
                  data: {
                    email,
                    name,
                    role: 'COMPTABLE',
                    userType: null, // Comptable n'a pas de sous-type
                    segment: 'LABO', // Default segment
                    creditLimit: 0, // No credit limit for accountants
                    passwordHash
                  }
                })

    // Log creation
    try {
      await logEntityCreation(
        'ACCOUNTANT_CREATED',
        'USER',
        user.id,
        session as any,
        { email, name, role: 'COMPTABLE' }
      )
    } catch (auditError) {
      console.error('Failed to log accountant creation:', auditError)
    }

    revalidatePath('/admin/users')
    revalidatePath('/admin')

    return { success: true, userId: user.id }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la création du comptable' }
  }
}

/**
 * Delete an accountant (COMPTABLE role)
 */
export async function deleteAccountantAction(accountantId: string) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'ADMIN') {
      return { error: 'Non autorisé' }
    }

    // Get the accountant
    const accountant = await prisma.user.findUnique({
      where: { id: accountantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    })

    if (!accountant) {
      return { error: 'Comptable introuvable' }
    }

    if (accountant.role !== 'COMPTABLE') {
      return { error: 'Cet utilisateur n\'est pas un comptable' }
    }

    // Delete the accountant
    await prisma.user.delete({
      where: { id: accountantId }
    })

    // Log deletion
    try {
      const { logEntityDeletion } = await import('@/lib/audit')
      await logEntityDeletion(
        'ACCOUNTANT_DELETED',
        'USER',
        accountantId,
        session as any,
        { email: accountant.email, name: accountant.name }
      )
    } catch (auditError) {
      console.error('Failed to log accountant deletion:', auditError)
    }

    revalidatePath('/admin/users')
    revalidatePath('/admin')

    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Erreur lors de la suppression du comptable' }
  }
}