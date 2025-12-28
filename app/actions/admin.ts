'use server'

import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'

export async function createInvitationAction(formData: FormData) {
  const email = formData.get('email') as string
  
  if (!email) return { error: 'Email requis' }

  // Check if user exists
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) return { error: 'Utilisateur déjà existant' }

  // Create invitation
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await prisma.invitation.create({
    data: {
      email,
      token,
      expiresAt,
    }
  })

  // In a real app, send email here.
  // For now, we return the link to display it.
  
  revalidatePath('/admin/clients')
  return { success: true, link: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}` }
}
