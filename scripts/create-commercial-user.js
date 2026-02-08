require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const EMAIL = 'commercial@douma.com'
const PASSWORD = 'password123'

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
  })

  if (existing) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10)
    await prisma.user.update({
      where: { email: EMAIL },
      data: { passwordHash },
    })
    console.log('✅ Compte commercial déjà existant : mot de passe réinitialisé à password123')
    console.log(`   Email: ${EMAIL}`)
    return
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  await prisma.user.create({
    data: {
      email: EMAIL,
      name: 'Commercial Douma',
      role: 'COMMERCIAL',
      segment: 'LABO',
      creditLimit: 0,
      passwordHash,
    },
  })

  console.log('✅ Compte commercial créé.')
  console.log(`   Email: ${EMAIL}`)
  console.log(`   Mot de passe: ${PASSWORD}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
