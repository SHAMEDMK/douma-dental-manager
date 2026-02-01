'use server'

import { prisma } from '@/lib/prisma'
import { login } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function acceptInvitationAction(token: string, prevState: any, formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const name = formData.get('name') as string
  const companyName = formData.get('companyName') as string

  if (password !== confirmPassword) {
    return { error: 'Les mots de passe ne correspondent pas' }
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  })

  if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
    return { error: 'Invitation invalide ou expirée' }
  }

  const passwordHash = await bcrypt.hash(password, 10)

  // Normalize email to lowercase (in case old invitation had uppercase)
  const normalizedEmail = invitation.email.trim().toLowerCase()

  // Create the user
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name,
      companyName,
      passwordHash,
      role: 'CLIENT',
    },
  })

  // Log audit: Client created
  try {
    const { logEntityCreation } = await import('@/lib/audit')
    await logEntityCreation(
      'CLIENT_CREATED',
      'CLIENT',
      user.id,
      null, // Pas de session (création via invitation)
      {
        email: user.email,
        name: user.name,
        companyName: user.companyName || null,
        segment: user.segment || 'LABO'
      }
    )
  } catch (auditError) {
    console.error('Failed to log client creation:', auditError)
  }

  // Mark invitation as used
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { usedAt: new Date() },
  })

  // Log the user in
  await login({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  redirect('/portal')
}
