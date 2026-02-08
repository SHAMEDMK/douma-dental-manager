'use server'

import { prisma } from '@/lib/prisma'
import { login } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { randomBytes } from 'crypto'

export async function loginAction(prevState: any, formData: FormData) {
  try {
    const rawEmail = formData.get('email') as string
    const password = formData.get('password') as string

    if (!rawEmail || !password) {
      return { error: 'Veuillez remplir tous les champs' }
    }

    // Normalize email to lowercase to avoid case-sensitive duplicates
    const email = rawEmail.trim().toLowerCase()

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.passwordHash) {
      return { error: 'Identifiants invalides' }
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)

    if (!isValid) {
      // Log failed login attempt
      try {
        const { auditLogWithSession } = await import('@/lib/audit')
        await auditLogWithSession(
          {
            action: 'LOGIN_FAILED',
            entityType: 'USER',
            entityId: user.id,
            details: { email, reason: 'Invalid password' },
          },
          { email: user.email, role: user.role }
        )
      } catch (auditError) {
        console.error('Failed to log failed login:', auditError)
      }
      return { error: 'Identifiants invalides' }
    }

    await login({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      userType: user.userType || null, // Include userType in session
    })

    // Log successful login
    try {
      const { auditLogWithSession } = await import('@/lib/audit')
      await auditLogWithSession(
        {
          action: 'LOGIN',
          entityType: 'USER',
          entityId: user.id,
        },
        { id: user.id, email: user.email, role: user.role }
      )
    } catch (auditError) {
      console.error('Failed to log login:', auditError)
    }

    if (user.role === 'ADMIN' || user.role === 'COMMERCIAL') {
      redirect('/admin')
    } else if (user.role === 'COMPTABLE') {
      redirect('/comptable/dashboard')
    } else if (user.role === 'MAGASINIER') {
      // Distinguish between magasinier (warehouse) and livreur (delivery)
      // userType: 'MAGASINIER' → interface magasinier
      // userType: 'LIVREUR' or null → interface livreur (delivery)
      if (user.userType === 'MAGASINIER') {
        redirect('/magasinier/dashboard')
      } else {
        // Default to delivery interface for livreurs or legacy users
        redirect('/delivery')
      }
    } else {
      redirect('/portal')
    }
  } catch (err) {
    // redirect() throws NEXT_REDIRECT - rethrow so Next.js handles it
    if (err && typeof err === 'object' && 'digest' in err && String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')) {
      throw err
    }
    console.error('Login action error:', err)
    return { error: 'Une erreur est survenue. Veuillez réessayer.' }
  }
}

/**
 * Request password reset - generates a token and sends email
 */
export async function requestPasswordReset(email: string) {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    })

    // Don't reveal if email exists (security best practice)
    if (!user || !user.passwordHash) {
      // Return success even if user doesn't exist (prevent email enumeration)
      return { success: true }
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    })

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        token,
        email: user.email,
        userId: user.id,
        expiresAt
      }
    })

    // Send reset email
    try {
      const { sendPasswordResetEmail } = await import('@/lib/email')
      const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password/${token}`
      
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name,
        resetLink
      })
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      // Don't fail the request, but log the error
    }

    // Log audit
    try {
      const { auditLogWithSession } = await import('@/lib/audit')
      await auditLogWithSession(
        {
          action: 'PASSWORD_RESET_REQUESTED',
          entityType: 'USER',
          entityId: user.id,
          details: { email: user.email }
        },
        { email: user.email, role: user.role }
      )
    } catch (auditError) {
      console.error('Failed to log password reset request:', auditError)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error requesting password reset:', error)
    return { error: 'Une erreur est survenue. Veuillez réessayer.' }
  }
}

/**
 * Reset password using token
 */
export async function resetPasswordAction(token: string, password: string, confirmPassword: string) {
  try {
    if (!password || password.length < 6) {
      return { error: 'Le mot de passe doit contenir au moins 6 caractères' }
    }

    if (password !== confirmPassword) {
      return { error: 'Les mots de passe ne correspondent pas' }
    }

    // Find reset token
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!resetToken) {
      return { error: 'Lien de réinitialisation invalide' }
    }

    if (resetToken.usedAt) {
      return { error: 'Ce lien de réinitialisation a déjà été utilisé' }
    }

    if (resetToken.expiresAt < new Date()) {
      return { error: 'Ce lien de réinitialisation a expiré' }
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10)

    // Update user password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    })

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    })

    // Delete all other reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        id: { not: resetToken.id }
      }
    })

    // Log audit
    try {
      const { auditLogWithSession } = await import('@/lib/audit')
      await auditLogWithSession(
        {
          action: 'PASSWORD_RESET',
          entityType: 'USER',
          entityId: resetToken.userId,
          details: { email: resetToken.email }
        },
        { email: resetToken.email, role: resetToken.user.role }
      )
    } catch (auditError) {
      console.error('Failed to log password reset:', auditError)
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return { error: 'Une erreur est survenue. Veuillez réessayer.' }
  }
}
