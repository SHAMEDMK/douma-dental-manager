import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const STAFF_ACCOUNTS = [
  { email: 'compta@douma.com', label: 'Comptable' },
  { email: 'commercial@douma.com', label: 'Commercial' },
  { email: 'stock@douma.com', label: 'Magasinier' },
  { email: 'livreur@douma.com', label: 'Livreur' },
]
const DEFAULT_PASSWORD = 'password123'

async function main() {
  const newPassword = process.argv[2] || DEFAULT_PASSWORD

  if (newPassword.length < 8) {
    console.error('❌ Le mot de passe doit contenir au moins 8 caractères')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  console.log('Réinitialisation des mots de passe (comptable, commercial, magasinier, livreur)...\n')

  for (const { email, label } of STAFF_ACCOUNTS) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log(`⏭️  ${label} (${email}) : absent en base, ignoré`)
      continue
    }
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    })
    console.log(`✅ ${label}: ${email} → mot de passe mis à jour`)
  }

  console.log(`\n💡 Mot de passe utilisé pour tous : ${newPassword}`)
  console.log('   Connectez-vous avec chaque email ci-dessus.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
