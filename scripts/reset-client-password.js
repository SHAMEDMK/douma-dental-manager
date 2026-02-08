import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const CLIENT_EMAIL = 'client@dental.com'
const DEFAULT_PASSWORD = 'password123'

async function main() {
  const newPassword = process.argv[2] || DEFAULT_PASSWORD

  if (newPassword.length < 8) {
    console.error('❌ Le mot de passe doit contenir au moins 8 caractères')
    process.exit(1)
  }

  const client = await prisma.user.findUnique({
    where: { email: CLIENT_EMAIL },
  })

  if (!client) {
    console.error(`❌ Le client ${CLIENT_EMAIL} n'existe pas. Exécutez d'abord: npm run db:seed`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { email: CLIENT_EMAIL },
    data: { passwordHash },
  })

  console.log('✅ Mot de passe client réinitialisé.')
  console.log(`   Email: ${CLIENT_EMAIL}`)
  console.log(`   Mot de passe: ${newPassword}`)
  console.log('\n💡 Connectez-vous au portail avec ces identifiants.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
