require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

const PASSWORD = 'password123'

const ACCOUNTS = [
  { email: 'compta@douma.com', name: 'Comptable Douma', role: 'COMPTABLE', userType: null },
  { email: 'stock@douma.com', name: 'Magasinier Douma', role: 'MAGASINIER', userType: 'MAGASINIER' },
]

async function main() {
  console.log('Comptable + Magasinier : création ou réinitialisation...\n')
  console.log('Base utilisée:', process.env.DATABASE_URL || '(non définie)\n')

  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  for (const acc of ACCOUNTS) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } })

    if (existing) {
      const data = { passwordHash }
      if (acc.userType != null) data.userType = acc.userType
      await prisma.user.update({
        where: { id: existing.id },
        data,
      })
      const after = await prisma.user.findUnique({ where: { id: existing.id } })
      const ok = after && after.passwordHash && await bcrypt.compare(PASSWORD, after.passwordHash)
      console.log(`✅ ${acc.role}: ${existing.email}`)
      console.log(`   Mot de passe réinitialisé. Vérification: ${ok ? 'OK' : 'ÉCHEC'}`)
    } else {
      await prisma.user.create({
        data: {
          email: acc.email,
          name: acc.name,
          role: acc.role,
          userType: acc.userType,
          segment: 'LABO',
          creditLimit: 0,
          passwordHash,
        },
      })
      console.log(`✅ ${acc.role}: ${acc.email} → compte créé`)
    }
  }

  console.log('\n--- Connexion (copier-coller exact) ---')
  console.log('Comptable:  compta@douma.com')
  console.log('Magasinier: stock@douma.com')
  console.log('Mot de passe pour les deux: password123')
  console.log('----------------------------------------')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Erreur:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
