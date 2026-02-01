const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetComptablePassword() {
  try {
    const comptaEmail = 'compta@douma.com'

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: comptaEmail }
    })

    if (!existingUser) {
      console.log(`❌ User ${comptaEmail} not found. Run 'npm run db:seed' first.`)
      process.exit(1)
    }

    // Get password from env or use default
    const newPassword = process.env.ADMIN_PASSWORD || 'password123'
    const passwordHash = await bcrypt.hash(newPassword, 10)

    // Update password
    await prisma.user.update({
      where: { email: comptaEmail },
      data: { passwordHash }
    })

    console.log(`✅ Password reset for ${comptaEmail}`)
    console.log(`🔑 New password: ${newPassword}`)
    console.log(`ℹ️  Password source: ${process.env.ADMIN_PASSWORD ? 'ADMIN_PASSWORD env var' : 'default (password123)'}`)

  } catch (error) {
    console.error('❌ Error resetting password:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetComptablePassword()
