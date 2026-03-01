'use server'

import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { AUTH_FORBIDDEN_ERROR_MESSAGE, AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE } from '@/lib/auth-errors'
import { getAppUrl } from '@/lib/email'
import { randomBytes } from 'crypto'

export async function createInvitation(data: { email: string; name: string; clientCode?: string | null; companyName?: string; segment?: 'LABO' | 'DENTISTE' | 'REVENDEUR'; discountRate?: number | null; creditLimit?: number | null }) {
  const session = await getSession()
  if (!session) return { error: AUTH_NOT_AUTHENTICATED_ERROR_MESSAGE }
  if (session.role !== 'ADMIN') return { error: AUTH_FORBIDDEN_ERROR_MESSAGE }

  const { name, companyName, segment = 'LABO', discountRate, creditLimit } = data
  const clientCode = data.clientCode?.trim() || null
  
  // Normalize email to lowercase to avoid case-sensitive duplicates
  const email = data.email?.trim().toLowerCase()
  
  if (!email) return { error: 'Email requis' }

  // Validate discountRate if provided
  if (discountRate !== null && discountRate !== undefined) {
    if (isNaN(discountRate) || discountRate < 0 || discountRate > 100) {
      return { error: 'La remise doit être un nombre entre 0 et 100' }
    }
  }

  // Validate creditLimit if provided
  if (creditLimit !== null && creditLimit !== undefined) {
    if (isNaN(creditLimit) || creditLimit < 0) {
      return { error: 'Le plafond de crédit doit être un nombre positif' }
    }
  }

  // Default creditLimit for clients if not provided
  const finalCreditLimit = creditLimit !== null && creditLimit !== undefined ? creditLimit : 5000

  // 1. Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } })

  // If clientCode is set, ensure it's not already used by another user (or allow if same user we're updating)
  if (clientCode !== null && clientCode !== '') {
    const existingWithCode = await prisma.user.findFirst({
      where: { clientCode },
      select: { id: true },
    })
    if (existingWithCode && (!user || user.id !== existingWithCode.id)) {
      return { error: 'Ce code client est déjà utilisé par un autre client.' }
    }
  }

  if (user) {
    // If user exists and has password, they don't need an invite (unless password reset, but that's different)
    if (user.passwordHash) {
      return { error: 'Cet utilisateur existe déjà et a un mot de passe.' }
    }
    // Update name/company/segment/discountRate/creditLimit/clientCode if provided
    await prisma.user.update({
        where: { id: user.id },
        data: { name, companyName, segment, discountRate: discountRate ?? null, creditLimit: finalCreditLimit, clientCode }
    })
  } else {
    // Create new user (pending)
    user = await prisma.user.create({
      data: {
        email,
        name,
        clientCode,
        companyName,
        segment,
        discountRate: discountRate ?? null,
        creditLimit: finalCreditLimit,
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

  // 4. Send invitation email (link built from APP_URL / NEXT_PUBLIC_APP_URL only)
  const baseUrl = getAppUrl()
  const invitationLink = `${baseUrl}/invite/${token}`

  let emailSent = false
  try {
    const { sendClientInvitationEmail } = await import('@/lib/email')
    const result = await sendClientInvitationEmail({
      to: email,
      clientName: name,
      invitationLink,
      companyName: companyName || undefined,
    })
    emailSent = result?.success === true
  } catch (emailError) {
    // Do not log token; invitation creation still succeeds
    console.error('Error sending invitation email (invitation created; link can be shared manually):', (emailError as Error)?.message ?? 'Unknown error')
  }

  return { success: true, link: invitationLink, emailSent }
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
