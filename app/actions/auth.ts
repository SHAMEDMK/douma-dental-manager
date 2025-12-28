'use server'

import { prisma } from '@/lib/prisma'
import { login } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Veuillez remplir tous les champs' }
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user || !user.passwordHash) {
    return { error: 'Identifiants invalides' }
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    return { error: 'Identifiants invalides' }
  }

  await login({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  if (user.role === 'ADMIN') {
    redirect('/admin')
  } else {
    redirect('/portal')
  }
}
