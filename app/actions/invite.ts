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

  // Create the user
  const user = await prisma.user.create({
    data: {
      email: invitation.email,
      name,
      companyName,
      passwordHash,
      role: 'CLIENT',
    },
  })

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
