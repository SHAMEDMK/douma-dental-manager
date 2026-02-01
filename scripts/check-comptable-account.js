const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkComptableAccount() {
  try {
    const comptaEmail = 'compta@douma.com'

    const user = await prisma.user.findUnique({
      where: { email: comptaEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      console.log(`❌ Compte ${comptaEmail} n'existe pas`)
      console.log('💡 Exécutez: npm run db:seed')
      return
    }

    console.log(`✅ Compte trouvé:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nom: ${user.name}`)
    console.log(`   Rôle: ${user.role}`)
    console.log(`   Créé le: ${user.createdAt.toLocaleString('fr-FR')}`)

    // Check password source
    const adminPassword = process.env.ADMIN_PASSWORD
    const expectedPassword = adminPassword || 'password123'
    console.log(`🔑 Mot de passe attendu: ${expectedPassword}`)
    console.log(`ℹ️  Source: ${adminPassword ? 'Variable ADMIN_PASSWORD' : 'Défaut (password123)'}`)

  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkComptableAccount()
