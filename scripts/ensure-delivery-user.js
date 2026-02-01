const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'stock@douma.com'
  const name = 'Magasinier Douma'
  const password = process.env.ADMIN_PASSWORD || 'Douma@2025!123'

  console.log('\n🔍 Vérification et création du compte MAGASINIER...\n')

  try {
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ Compte non trouvé. Création en cours...\n')
      
      const passwordHash = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'MAGASINIER',
          segment: 'LABO',
          creditLimit: 0,
          passwordHash
        }
      })
      
      console.log('✅ Compte MAGASINIER créé avec succès!\n')
    } else {
      console.log('✅ Compte existant trouvé:', user.email)
      
      // Ensure role is MAGASINIER
      if (user.role !== 'MAGASINIER') {
        console.log('⚠️  Rôle incorrect. Mise à jour en cours...')
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'MAGASINIER' }
        })
        console.log('✅ Rôle mis à jour vers MAGASINIER\n')
      } else {
        console.log('✅ Rôle correct: MAGASINIER\n')
      }

      // Update password to match ADMIN_PASSWORD
      const passwordHash = await bcrypt.hash(password, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      })
      console.log('✅ Mot de passe mis à jour\n')
    }

    // Verify the account
    const verified = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        name: true,
        role: true
      }
    })

    console.log('📋 Compte vérifié:')
    console.log(`   Email: ${verified.email}`)
    console.log(`   Nom: ${verified.name}`)
    console.log(`   Rôle: ${verified.role}\n`)

    console.log('🔐 Identifiants de connexion:')
    console.log(`   URL: http://localhost:3000/login`)
    console.log(`   Email: ${email}`)
    console.log(`   Mot de passe: ${password}\n`)

    console.log('📋 Après connexion, redirection vers:')
    console.log(`   http://localhost:3000/delivery\n`)

  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error(error)
    process.exit(1)
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
