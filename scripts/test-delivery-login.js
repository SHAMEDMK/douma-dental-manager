const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const email = 'stock@douma.com'
  const testPassword = process.env.ADMIN_PASSWORD || 'Douma@2025!123'

  console.log('\n🔐 Test de connexion du compte livreur...\n')

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true
      }
    })

    if (!user) {
      console.log('❌ Compte non trouvé!')
      console.log('   Exécutez: node scripts/ensure-delivery-user.js\n')
      process.exit(1)
    }

    console.log('✅ Compte trouvé:')
    console.log(`   Email: ${user.email}`)
    console.log(`   Nom: ${user.name}`)
    console.log(`   Rôle: ${user.role}\n`)

    if (user.role !== 'MAGASINIER') {
      console.log('⚠️  ATTENTION: Le rôle n\'est pas MAGASINIER!')
      console.log(`   Rôle actuel: ${user.role}`)
      console.log('   Correction en cours...\n')
      
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'MAGASINIER' }
      })
      
      console.log('✅ Rôle corrigé vers MAGASINIER\n')
    }

    // Test password
    if (!user.passwordHash) {
      console.log('❌ Pas de mot de passe défini!')
      console.log('   Mise à jour en cours...\n')
      
      const passwordHash = await bcrypt.hash(testPassword, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      })
      
      console.log('✅ Mot de passe défini\n')
    } else {
      const isValid = await bcrypt.compare(testPassword, user.passwordHash)
      if (!isValid) {
        console.log('⚠️  Le mot de passe ne correspond pas!')
        console.log('   Mise à jour en cours...\n')
        
        const passwordHash = await bcrypt.hash(testPassword, 10)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash }
        })
        
        console.log('✅ Mot de passe mis à jour\n')
      } else {
        console.log('✅ Mot de passe valide\n')
      }
    }

    console.log('📋 Résumé:')
    console.log(`   ✅ Compte: ${user.email}`)
    console.log(`   ✅ Rôle: MAGASINIER`)
    console.log(`   ✅ Mot de passe: ${testPassword}\n`)

    console.log('🔗 Pour vous connecter:')
    console.log(`   1. Allez sur: http://localhost:3000/login`)
    console.log(`   2. Email: ${email}`)
    console.log(`   3. Mot de passe: ${testPassword}`)
    console.log(`   4. Vous serez redirigé vers: http://localhost:3000/delivery\n`)

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
