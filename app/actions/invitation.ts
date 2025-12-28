'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { randomBytes } from 'crypto'
import { redirect } from 'next/navigation'

export async function createInvitation(data: { email: string; name: string; companyName?: string }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return { error: 'Non autorisé' }

  const { email, name, companyName } = data

  // 1. Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    // If user exists and has password, they don't need an invite (unless password reset, but that's different)
    if (user.passwordHash) {
      return { error: 'Cet utilisateur existe déjà et a un mot de passe.' }
    }
    // Update name/company if provided
    await prisma.user.update({
        where: { id: user.id },
        data: { name, companyName }
    })
  } else {
    // Create new user (pending)
    user = await prisma.user.create({
      data: {
        email,
        name,
        companyName,
        role: 'CLIENT',
        passwordHash: null, // Pending activation
      }
    })
  }

  // 2. Generate Token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // 3. Create Invitation
  await prisma.invitation.create({
    data: {
      email,
      token,
      expiresAt
    }
  })

  // 4. Return link (In production, send email here)
  // For this MVP, we return the link to be copied by Admin
  return { success: true, link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}` }
}

import { hash } from 'bcryptjs'

export async function acceptInvitation(token: string, passwordRaw: string) {
    // 1. Find valid invitation
    const invitation = await prisma.invitation.findUnique({
        where: { token }
    })

    if (!invitation) return { error: 'Invitation invalide' }
    if (invitation.usedAt) return { error: 'Invitation déjà utilisée' }
    if (invitation.expiresAt < new Date()) return { error: 'Invitation expirée' }

    // 2. Find user
    const user = await prisma.user.findUnique({ where: { email: invitation.email } })
    if (!user) return { error: 'Utilisateur introuvable' }

    // 3. Hash Password
    const passwordHash = await hash(passwordRaw, 10)

    // 4. Update User & Invitation
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        }),
        prisma.invitation.update({
            where: { id: invitation.id },
            data: { usedAt: new Date() }
        })
    ])

    return { success: true }
}
