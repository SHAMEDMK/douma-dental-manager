import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const ACCOUNTS = [
  { email: 'commercial@douma.com', label: 'Commercial' },
  { email: 'livreur@douma.com', label: 'Livreur' },
]
const PASSWORD = 'password123'

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  console.log('Réinitialisation commercial + livreur → password123\n')

  for (const { email, label } of ACCOUNTS) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log(`❌ ${label} (${email}) : absent en base. Lancez "npm run db:seed" d'abord.`)
      continue
    }
    await prisma.user.update({
      where: { email },
      data: { passwordHash },
    })
    console.log(`✅ ${label}: ${email} → mot de passe réinitialisé`)
  }

  console.log(`\n💡 Connexion : ${PASSWORD}`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
