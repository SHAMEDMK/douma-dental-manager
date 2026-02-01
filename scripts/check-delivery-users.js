const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('\n🔍 Vérification des comptes Livreur (MAGASINIER):\n')
  
  const deliveryUsers = await prisma.user.findMany({
    where: { role: 'MAGASINIER' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true
    }
  })

  if (deliveryUsers.length === 0) {
    console.log('❌ Aucun compte MAGASINIER trouvé!')
    console.log('\n📝 Pour créer un compte livreur, utilisez:')
    console.log('   node scripts/create-delivery-user.js email@example.com "Nom Livreur"')
    console.log('   Ou connectez-vous avec: stock@douma.com (si le seed a été exécuté)\n')
  } else {
    console.log(`✅ ${deliveryUsers.length} compte(s) MAGASINIER trouvé(s):\n`)
    deliveryUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`)
      console.log(`   - Rôle: ${user.role}`)
      console.log(`   - Mot de passe: Douma@2025!123 (si créé via seed)`)
      console.log(`   - Accès: http://localhost:3000/delivery\n`)
    })
  }

  // Also check for SHIPPED orders
  const shippedOrders = await prisma.order.findMany({
    where: { status: 'SHIPPED' },
    select: {
      id: true,
      orderNumber: true,
      deliveryConfirmationCode: true,
      deliveryAgentName: true
    }
  })

  console.log(`📦 Commandes expédiées (SHIPPED): ${shippedOrders.length}\n`)
  if (shippedOrders.length > 0) {
    console.log('   Ces commandes seront visibles dans l\'espace livreur:\n')
    shippedOrders.forEach((order, index) => {
      console.log(`${index + 1}. ${order.orderNumber || order.id.slice(-8)}`)
      console.log(`   - Code: ${order.deliveryConfirmationCode || '(pas encore généré)'}`)
      console.log(`   - Livreur: ${order.deliveryAgentName || '(non renseigné)'}\n`)
    })
  } else {
    console.log('   ⚠️  Aucune commande expédiée pour le moment.')
    console.log('   Pour tester l\'espace livreur:')
    console.log('   1. Connectez-vous en tant qu\'admin')
    console.log('   2. Préparer une commande (status PREPARED)')
    console.log('   3. Expédier la commande (status SHIPPED) → Un code sera généré')
    console.log('   4. Connectez-vous en tant que livreur pour voir la commande\n')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
