const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'stock@douma.com'
  const name = process.argv[3] || 'Livreur Douma'
  const password = process.env.ADMIN_PASSWORD || 'Douma@2025!123'

  console.log(`\n📦 Création du compte livreur...\n`)
  console.log(`   Email: ${email}`)
  console.log(`   Nom: ${name}`)
  console.log(`   Mot de passe: ${password}\n`)

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email }
    })

    if (existing) {
      // Update role to MAGASINIER if not already
      if (existing.role !== 'MAGASINIER') {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: 'MAGASINIER' }
        })
        console.log(`✅ Compte existant mis à jour avec le rôle MAGASINIER`)
      } else {
        console.log(`⚠️  Le compte existe déjà avec le rôle MAGASINIER`)
      }

      // Update password if ADMIN_PASSWORD is set
      if (process.env.ADMIN_PASSWORD) {
        const passwordHash = await bcrypt.hash(password, 10)
        await prisma.user.update({
          where: { id: existing.id },
          data: { passwordHash }
        })
        console.log(`✅ Mot de passe mis à jour\n`)
      }
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(password, 10)
      await prisma.user.create({
        data: {
          email,
          name,
          role: 'MAGASINIER',
          segment: 'LABO', // Default segment
          passwordHash
        }
      })
      console.log(`✅ Compte livreur créé avec succès\n`)
    }

    console.log(`🔐 Identifiants de connexion:`)
    console.log(`   URL: http://localhost:3000/login`)
    console.log(`   Email: ${email}`)
    console.log(`   Mot de passe: ${password}\n`)

    console.log(`📋 Après connexion, vous serez redirigé vers:`)
    console.log(`   http://localhost:3000/delivery\n`)

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
