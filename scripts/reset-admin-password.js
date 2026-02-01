import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@douma.com'
  
  // Récupérer le nouveau mot de passe depuis les arguments
  const newPassword = process.argv[2]
  
  if (!newPassword) {
    console.error('❌ Usage: npm run db:reset-password <nouveau_mot_de_passe>')
    console.log('\nExemple:')
    console.log('  npm run db:reset-password MonNouveauMotDePasse123')
    process.exit(1)
  }
  
  if (newPassword.length < 8) {
    console.error('❌ Le mot de passe doit contenir au moins 8 caractères')
    process.exit(1)
  }
  
  // Vérifier que l'admin existe
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!admin) {
    console.error(`❌ L'utilisateur admin ${adminEmail} n'existe pas.`)
    console.log('💡 Exécutez d\'abord: npm run db:seed')
    process.exit(1)
  }

  console.log(`\n🔐 Réinitialisation du mot de passe pour: ${adminEmail}`)
  console.log(`   Nom: ${admin.name}`)
  
  // Hasher le nouveau mot de passe
  const passwordHash = await bcrypt.hash(newPassword, 10)

  // Mettre à jour dans la base de données
  await prisma.user.update({
    where: { email: adminEmail },
    data: { passwordHash }
  })

  console.log('\n✅ Mot de passe admin réinitialisé avec succès!')
  console.log(`   Email: ${adminEmail}`)
  console.log(`   Nouveau mot de passe: ${'*'.repeat(newPassword.length)}`)
  console.log('\n💡 Vous pouvez maintenant vous connecter avec ce nouveau mot de passe.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
